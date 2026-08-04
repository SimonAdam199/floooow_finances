import { NextFunction, Request, Response } from 'express';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export interface AuthenticatedUser {
  uid: string;
  email: string | undefined;
  name: string | undefined;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

function getFirebaseAuth() {
  if (!getApps().length) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountJson) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not configured on the server.');
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
    });
  }

  return getAuth();
}

export async function requireFirebaseUser(req: Request, res: Response, next: NextFunction) {
  const authorization = req.header('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication is required.' });
    return;
  }

  try {
    const decodedToken = await getFirebaseAuth().verifyIdToken(authorization.slice('Bearer '.length));
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
    };
    next();
  } catch (error) {
    console.error('Firebase token verification failed:', error);
    res.status(401).json({ success: false, error: 'The authentication token is invalid or expired.' });
  }
}

export function getRequestUser(req: Request): AuthenticatedUser {
  if (!req.user) {
    throw new Error('Authenticated user is missing from the request.');
  }
  return req.user;
}
