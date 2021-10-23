import React, { useContext, useEffect, useState } from 'react';
import {
TokenInfo,
  TokenListContainer,
  TokenListProvider,
} from "@solana/spl-token-registry";

export interface TokenListContextState {
    mainnetTokens: TokenInfo[];
  }

const TokenListContext =
  React.createContext<TokenListContextState | null>(null);

export function SPLTokenListProvider({ children = null as any }) {  
    const [tokenList, setTokenList] = useState<TokenListContainer | null>(null);
    
    useEffect(() => {
    new TokenListProvider().resolve().then(setTokenList);
    }, [setTokenList]);  

    // Added tokenList to know in which currency the auction is (SOL or other SPL) 
    const mainnetTokens = tokenList?tokenList.filterByClusterSlug("mainnet-beta").getList():[]

    return (
        <TokenListContext.Provider value={{ mainnetTokens }}>
          {children}
        </TokenListContext.Provider>
      );
}

export const useTokenList = () => {
    const context = useContext(TokenListContext);
    return context as TokenListContextState;
  };

export const queryTokenList = () => {
    const { mainnetTokens } = useTokenList();
  
    return mainnetTokens;
  };