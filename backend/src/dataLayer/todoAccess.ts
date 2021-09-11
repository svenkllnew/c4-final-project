import * as AWS  from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { TodoItem } from '../models/TodoItem'
import { createLogger } from '../utils/logger'
import { UpdateTodoRequest } from '../requests/UpdateTodoRequest'

const logger = createLogger('Data layer')
const XAWS = AWSXRay.captureAWS(AWS)

export class TodoAccess {

  constructor(
    private readonly docClient: DocumentClient = new XAWS.DynamoDB.DocumentClient(),
    private readonly s3 = new XAWS.S3({signatureVersion: 'v4'}),
    private readonly todosTable = process.env.TODOS_TABLE,
    private readonly todoIndex = process.env.TODOS_INDEX,
    private readonly urlExpiration = process.env.SIGNED_URL_EXPIRATION,
    private readonly bucketName = process.env.IMAGES_S3_BUCKET ) {}

  async getAllTodos(userId: string): Promise<TodoItem[]> {
    logger.info('Getting all todos') // winston

    const query = {
      TableName: this.todosTable,
      ScanIndexForward: false,
      IndexName: this.todoIndex,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
          ':userId': userId
      },
      ProjectionExpression: 'todoId, createdAt, #todoName, dueDate, done, imageUrl',
      // I'm using ExpressionAttributeNames in this case to get over a 'Attribute name is a reserved keyword' error
      ExpressionAttributeNames: {
        "#todoName": "name"
      }
    }

    const result = await this.docClient.query(query).promise()
    const items = result.Items

    return items as TodoItem[]
  }

  async createTodo(todo: TodoItem): Promise<TodoItem> {
    await this.docClient.put({
      TableName: this.todosTable,
      Item: todo
    }).promise()

    return todo
  }

  async deleteTodo(todoId: string, userId: string): Promise<void> {

    const params = {
      TableName: this.todosTable,
      Key: {
        userId: userId,
        todoId: todoId
      }
    }

    await this.docClient.delete(params).promise()
  }

  async updateTodo(updateTodoRequest: UpdateTodoRequest, userId: string, todoId: string) {
    const params = {
      TableName: this.todosTable,
      Key: {
        userId: userId,
        todoId: todoId
      },
      UpdateExpression: "set #todoName = :todoName, dueDate = :dueDate, done = :done",
      ExpressionAttributeValues: {
        ':todoName': updateTodoRequest.name,
        ':dueDate': updateTodoRequest.dueDate,
        ':done': updateTodoRequest.done
      },
      // I'm using ExpressionAttributeNames in this case to get over a 'Attribute name is a reserved keyword' error
      ExpressionAttributeNames: {
        "#todoName": "name"
      }
    }

    return await this.docClient.update(params).promise()

  }

  async addImageToTodo(imageId: string, todoId: string, userId: string) {
    const params = {
      TableName: this.todosTable,
      Key: {
        userId: userId,
        todoId: todoId
      },
      UpdateExpression: "set imageUrl = :imageUrl",
      ExpressionAttributeValues: {
        ':imageUrl': `https://${this.bucketName}.s3.amazonaws.com/${imageId}`
      }
    }

    return await this.docClient.update(params).promise()
  }

  async generateUploadUrl(imageId: string) {
    return this.s3.getSignedUrl('putObject', {
      Bucket: this.bucketName,
      Key: imageId,
      Expires: Number(this.urlExpiration)
    })
  }

}


