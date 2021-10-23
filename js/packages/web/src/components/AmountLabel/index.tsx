import React, { useEffect, useState } from 'react';
import { Statistic } from 'antd';
import { useSolPrice, useAltSplPrice } from '../../contexts';
import { formatAmount, formatUSD } from '@oyster/common';
import { SolCircle } from '../Custom';

interface IAmountLabel {
  amount: number | string;
  displayUSD?: boolean;
  displaySymbol?: boolean;
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
    displaySymbol = false,
    title = '',
    style = {},
    containerStyle = {},
    iconSize = 38,
    customPrefix,
    ended,
  } = props;
  // Add formattedAmount to be able to parse USD value and retain abbreviation of value
  const amount = typeof _amount === 'string' ? parseFloat(_amount) : _amount;
  const formattedAmount = formatAmount(amount)

  const solPrice = useSolPrice();
  const altSplPrice = useAltSplPrice()

  const symbolName = process.env.NEXT_SPL_TOKEN_SYMBOL?process.env.NEXT_SPL_TOKEN_SYMBOL:"SOL"

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
          value={`${formattedAmount} ${displaySymbol ? symbolName : ''}`}
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
