export interface Env {
  DB: {
    prepare: (query: string) => {
      bind: (...args: any[]) => {
        run: () => Promise<any>;
        first: () => Promise<any>;
      };
    };
  };
}