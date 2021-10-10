//Define env vars
declare global {
    namespace NodeJS {
      interface ProcessEnv {
        TOKEN: string;
        PROVIDER: string;
        ETHERSCAN_API_KEY: string;
      }
    }
  }
export {}