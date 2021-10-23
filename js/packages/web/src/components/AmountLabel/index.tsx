import React, { useEffect, useState } from 'react';
import { Statistic } from 'antd';
import { useSolPrice, useAltSplPrice } from '../../contexts';
import { formatUSD } from '@oyster/common';
import { SolCircle } from '../Custom';

interface IAmountLabel {
  amount: number | string;
  displayUSD?: boolean;
  displaySOL?: boolean;
  title?: string;
  style?: object;
  containerStyle?: object;
  iconSize?: number;
  customPrefix?: JSX.Element;
  ended?: boolean;
}

export const AmountLabel = (props: IAmountLabel) => {
  const {
    amount: _amount,
    displayUSD = true,
    displaySOL = false,
    title = '',
    style = {},
    containerStyle = {},
    iconSize = 38,
    customPrefix,
    ended,
  } = props;
  const amount = typeof _amount === 'string' ? parseFloat(_amount) : _amount;

  const solPrice = useSolPrice();
  const altSplPrice = useAltSplPrice()

  const [priceUSD, setPriceUSD] = useState<number | undefined>(undefined);

  useEffect(() => {
    process.env.NEXT_SPL_TOKEN_MINT? setPriceUSD(altSplPrice * amount)
        :setPriceUSD(solPrice * amount);
  }, [amount, solPrice, altSplPrice]);

  const PriceNaN = isNaN(amount);

  return (
    <div style={{ display: 'flex', ...containerStyle }}>
      {PriceNaN === false && (
        <Statistic
          style={style}
          className="create-statistic"
          title={title || ''}
          value={`${amount}${displaySOL ? ' SOL' : ''}`}
          prefix={customPrefix || <SolCircle iconSize={iconSize} />}
        />
      )}
      {displayUSD && (
        <div className="usd">
          {PriceNaN === false ? (
            formatUSD.format(priceUSD || 0)
          ) : (
            <div className="placebid">{ended ? 'N/A' : 'Place Bid'}</div>
          )}
        </div>
      )}
    </div>
  );
};
