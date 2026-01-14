import jwt, { SignOptions, Secret } from "jsonwebtoken";
import { UserDocument } from "../models/user.model";
import { config } from "../config/app.config";

export type AccessTPayload = {
  userId: UserDocument["_id"];
};

type SignOptsAndSecret = SignOptions & { secret: Secret };

const defaults: SignOptions = {
  audience: ["user"],
};

export const accessTokenSignOptions: SignOptsAndSecret = {
  expiresIn: config.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  secret: (config.JWT_SECRET as unknown) as Secret,
};

export const signJwtToken = (
  payload: AccessTPayload,
  options?: SignOptsAndSecret
) => {
  const { secret, ...opts } = options || accessTokenSignOptions;
  return jwt.sign(payload, secret as Secret, { ...defaults, ...opts });
};
