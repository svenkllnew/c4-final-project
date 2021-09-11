import { CustomAuthorizerEvent, CustomAuthorizerResult } from 'aws-lambda'
import 'source-map-support/register'

import { verify } from 'jsonwebtoken'
import { createLogger } from '../../utils/logger'
// import { Jwt } from '../../auth/Jwt'
import { JwtPayload } from '../../auth/JwtPayload'

//import { certToPEM } from '../../auth/utils'
//import Axios from 'axios'

const logger = createLogger('auth')

// TODO: Provide a URL that can be used to download a certificate that can be used
// to verify JWT token signature.
// To get this URL you need to go to an Auth0 page -> Show Advanced Settings -> Endpoints -> JSON Web Key Set
//const jwksUrl = process.env.AUTH_0_JWKS_URL

export const handler = async (event: CustomAuthorizerEvent): Promise<CustomAuthorizerResult> => {
  logger.info('Authorizing a user', event.authorizationToken)
  try {
    const jwtToken = await verifyToken(event.authorizationToken)

    return {
      principalId: jwtToken.sub,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: '*'
          }
        ]
      }
    }
  } catch (e) {
    logger.error('User not authorized', { error: e.message })

    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: '*'
          }
        ]
      }
    }
  }
}

async function verifyToken(authHeader: string): Promise<JwtPayload> {
  const token = getToken(authHeader)
  // const jwt: Jwt = decode(token, { complete: true }) as Jwt

  //const cert = await getCertFromJwks()

  // TODO: Implement token verification
  // You should implement it similarly to how it was implemented for the exercise for the lesson 5
  // You can read more about how to do this here: https://auth0.com/blog/navigating-rs256-and-jwks/
  return verify(token, `-----BEGIN CERTIFICATE-----
MIIDCzCCAfOgAwIBAgIJUftSC1hDAN0VMA0GCSqGSIb3DQEBCwUAMCMxITAfBgNV
BAMTGHVkYWNpdHkyMDIxLmV1LmF1dGgwLmNvbTAeFw0yMTA4MjcxMTU4MjVaFw0z
NTA1MDYxMTU4MjVaMCMxITAfBgNVBAMTGHVkYWNpdHkyMDIxLmV1LmF1dGgwLmNv
bTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBANfA1DpowpNIUtNRqfc+
6hZIzkMUgGdS96CzT9ivz/KlbxvQXW2ELYrcMcXGsug6MLpN7ET0X1qT64QKsxkq
kCpnXvGIX9Gb1b9YpHFatdU2o6s67dPWS51/1chkuIPtIxlczViA5HWBxgKaZ+gf
LQZW5w5hABgsF+thVFgeVThiUiKabD+iNxmkTp3nJgFTWjJBhPnlv47hsXtbEtBY
/XRAjr22/TEgWnTPYJgqEWoTJdi8+No8rQdENMtHKj9leH/zDz6TPJ7mnZtZ/5Cx
YM7p0JLZHUHtcTXhdWEyLvEjtyUl/S/s9f+3sBv836gL90MzcbBJQGr1FvCE9bQg
bOkCAwEAAaNCMEAwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUG9b561w06WTC
UBS0znI6l/WQbYgwDgYDVR0PAQH/BAQDAgKEMA0GCSqGSIb3DQEBCwUAA4IBAQDA
9AUvH0M3dw/v/pLq6nfTqfqyMN/laUnxisgL7jXb3uZx9f/pKrlOpgqSl+1JXxNy
+aNACEBxxPniU1Z+BLnFeFYIqbbZnmgyKHWzMIL6FlguJ9QVLAEkPSqyMQxMP72w
BTi5kqswFnQ5QUlRfLB8Rluf+NJ7T7sPkcT7nSusGd4ZKyGT2nHM5RYqPuE89kSu
XwNcJbFd+jn0LrjCJew9JG8iIujWWEn91tChNH4XO3C5PmRn5wamKT4Zl9hfBVeH
gnPMjlAbi8jpyEkzaABn/irpbaqL/LMK/rcPfwKb8O0E+yoEpTVGt5fyuGaYOpKa
BPkJNlR8R3GdFNroiUEp
-----END CERTIFICATE-----`, { algorithms: ['RS256'] }) as JwtPayload
}

function getToken(authHeader: string): string {
  if (!authHeader) throw new Error('No authentication header')

  if (!authHeader.toLowerCase().startsWith('bearer '))
    throw new Error('Invalid authentication header')

  const split = authHeader.split(' ')
  const token = split[1]

  return token
}

/*async function getCertFromJwks(){

  // TODO
  // if this was a real live app, I would implement something closer to https://auth0.com/blog/navigating-rs256-and-jwks/
  // for now I stripped the functionality back to just enough to get what we need

  const response = await Axios.get(jwksUrl)
  const keys = response.data.keys
  
  const signingKeys = keys
        .filter(key => key.use === 'sig' // JWK property `use` determines the JWK is for signing
                    && key.kty === 'RSA' // We are only supporting RSA
                    && key.kid           // The `kid` must be present to be useful for later
                    && key.x5c && key.x5c.length // Has useful public keys (we aren't using n or e)
       ).map(key => {
         return { kid: key.kid, nbf: key.nbf, publicKey: certToPEM(key.x5c[0]) };
       });
  
  return signingKeys[0].publicKey
}*/
