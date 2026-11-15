declare module "@aws-amplify/ui-react" {
  import React from "react";

  export interface AuthenticatorUser {
    username: string;
    userId: string;
    signInDetails?: {
      loginId?: string;
    };
  }

  export interface AuthenticatorProps {
    children?:
      | ((props: { signOut?: () => void; user?: AuthenticatorUser }) => React.ReactNode)
      | React.ReactNode;
    variation?: "default" | "modal";
    hideSignUp?: boolean;
    loginMechanisms?: string[];
  }

  export const Authenticator: React.FC<AuthenticatorProps> & {
    Provider: React.FC<{ children?: React.ReactNode }>;
  };

  export function useAuthenticator(selector?: (context: Record<string, unknown>) => unknown[]): {
    user?: AuthenticatorUser;
    signOut: () => void;
    authStatus: "configuring" | "authenticated" | "unauthenticated";
  };
}

declare module "aws-amplify" {
  export const Amplify: {
    configure: (config: Record<string, unknown>) => void;
  };
}

declare module "aws-amplify/auth" {
  export interface AuthJwtToken {
    toString: () => string;
    payload?: Record<string, unknown>;
  }

  export function fetchAuthSession(options?: { forceRefresh?: boolean }): Promise<{
    tokens?: {
      idToken?: AuthJwtToken;
      accessToken?: AuthJwtToken;
    };
  }>;
  export function getCurrentUser(): Promise<{
    username: string;
    userId: string;
    signInDetails?: { loginId?: string };
  }>;
  export function signOut(): Promise<void>;
}

