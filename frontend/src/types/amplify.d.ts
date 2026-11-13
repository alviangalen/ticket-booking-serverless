declare module "@aws-amplify/ui-react" {
  import React from "react";

  export interface AuthenticatorProps {
    children?: ((props: { signOut?: () => void; user?: any }) => React.ReactNode) | React.ReactNode;
    variation?: "default" | "modal";
    hideSignUp?: boolean;
    loginMechanisms?: string[];
  }

  export const Authenticator: React.FC<AuthenticatorProps> & {
    Provider: React.FC<{ children?: React.ReactNode }>;
  };

  export function useAuthenticator(selector?: (context: any) => any[]): {
    user: any;
    signOut: () => void;
    authStatus: "configuring" | "authenticated" | "unauthenticated";
  };
}

declare module "aws-amplify" {
  export const Amplify: {
    configure: (config: any) => void;
  };
}

declare module "aws-amplify/auth" {
  export function fetchAuthSession(): Promise<{
    tokens?: {
      idToken?: { toString: () => string };
      accessToken?: { toString: () => string };
    };
  }>;
  export function getCurrentUser(): Promise<{
    username: string;
    userId: string;
    signInDetails?: { loginId?: string };
  }>;
  export function signOut(): Promise<void>;
}

