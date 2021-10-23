import React, { useContext, useEffect, useState } from 'react';
export const COINGECKO_POOL_INTERVAL = 1000 * 60; // 60 sec
export const COINGECKO_API = 'https://api.coingecko.com/api/v3/';
export const COINGECKO_COIN_PRICE_API = `${COINGECKO_API}simple/price`;
export interface CoingeckoContextState {
  solPrice: number;
  altSplPrice: number
}

export const solToUSD = async (): Promise<number> => {
  const url = `${COINGECKO_COIN_PRICE_API}?ids=solana&vs_currencies=usd`;
  const resp = await window.fetch(url).then(resp => resp.json());
  return resp.solana.usd;
};

export const altSplToUSD = async (): Promise<number> => {
  if (!process.env.NEXT_CG_SPL_TOKEN_ID)
    throw new Error("Alternative SPL token triggered but no token mint specified")

  const cg_spl_token_id = process.env.NEXT_CG_SPL_TOKEN_ID
  const url = `${COINGECKO_COIN_PRICE_API}?ids=${cg_spl_token_id}&vs_currencies=usd`;
  const resp = await window.fetch(url).then(resp => resp.json());
  return resp[cg_spl_token_id].usd;
};

const CoingeckoContext =
  React.createContext<CoingeckoContextState | null>(null);
export function CoingeckoProvider({ children = null as any }) {
  const [solPrice, setSolPrice] = useState<number>(0);
  const [altSplPrice, setAltSplPrice] = useState<number>(0);

  useEffect(() => {
    let timerId = 0;
    const queryPrice = async () => {
      const solprice = await solToUSD();
      const altSplprice = await altSplToUSD();
      setSolPrice(solprice);
      setAltSplPrice(altSplprice);
      startTimer();
    };

    const startTimer = () => {
      timerId = window.setTimeout(async () => {
        queryPrice();
      }, COINGECKO_POOL_INTERVAL);
    };

    queryPrice();
    return () => {
      clearTimeout(timerId);
    };
  }, [setSolPrice, setAltSplPrice]);

  return (
    <CoingeckoContext.Provider value={{ solPrice, altSplPrice }}>
      {children}
    </CoingeckoContext.Provider>
  );
}

export const useCoingecko = () => {
  const context = useContext(CoingeckoContext);
  return context as CoingeckoContextState;
};

export const useSolPrice = () => {
  const { solPrice } = useCoingecko();

  return solPrice;
};

export const useAltSplPrice = () => {
  const { altSplPrice } = useCoingecko();

  return altSplPrice;
};
