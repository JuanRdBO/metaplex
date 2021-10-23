import {
  Keypair,
  Connection,
  TransactionInstruction,
  PublicKey,
} from '@solana/web3.js';
import {
  sendTransactionWithRetry,
  placeBid,
  cache,
  ensureWrappedAccount,
  toLamports,
  ParsedAccount,
  toPublicKey,
  WalletSigner,
  createAssociatedTokenAccountInstruction,
  programIds,
  ALT_SPL_MINT,
  pubkeyToString,
} from '@oyster/common';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { approve } from '@oyster/common/dist/lib/models/account';
import { createTokenAccount } from '@oyster/common/dist/lib/actions/account';
import { TokenAccount } from '@oyster/common/dist/lib/models/account';

import { AccountLayout, MintInfo } from '@solana/spl-token';
import { AuctionView } from '../hooks';
import BN from 'bn.js';
import { setupCancelBid } from './cancelBid';
import { QUOTE_MINT } from '../constants';

export async function sendPlaceBid(
  connection: Connection,
  wallet: WalletSigner,
  bidderTokenAccount: string | undefined,
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
  // value entered by the user adjust to decimals of the mint
  amount: number | BN,
) {
  const signers: Keypair[][] = [];
  const instructions: TransactionInstruction[][] = [];
  const bid = await setupPlaceBid(
    connection,
    wallet,
    bidderTokenAccount,
    auctionView,
    accountsByMint,
    amount,
    instructions,
    signers,
  );

  await sendTransactionWithRetry(
    connection,
    wallet,
    instructions[0],
    signers[0],
    'single',
  );

  return {
    amount: bid,
  };
}

export async function setupPlaceBid(
  connection: Connection,
  wallet: WalletSigner,
  bidderTokenAccount: string | undefined,
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
  // value entered by the user adjust to decimals of the mint
  // If BN, then assume instant sale and decimals already adjusted.
  amount: number | BN,
  overallInstructions: TransactionInstruction[][],
  overallSigners: Keypair[][],
): Promise<BN> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  let signers: Keypair[] = [];
  let instructions: TransactionInstruction[] = [];
  const cleanupInstructions: TransactionInstruction[] = [];

  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span,
  );

  const tokenAccount = bidderTokenAccount
    ? (cache.get(bidderTokenAccount) as TokenAccount)
    : undefined;
  const mint = cache.get(
    tokenAccount ? tokenAccount.info.mint : QUOTE_MINT,
  ) as ParsedAccount<MintInfo>;

  const lamports =
    accountRentExempt +
    (typeof amount === 'number'
      ? toLamports(amount, mint.info)
      : amount.toNumber());

  let bidderPotTokenAccount: string;
  if (!auctionView.myBidderPot) {
    bidderPotTokenAccount = createTokenAccount(
      instructions,
      wallet.publicKey,
      accountRentExempt,
      toPublicKey(auctionView.auction.info.tokenMint),
      toPublicKey(auctionView.auction.pubkey),
      signers,
    ).toBase58();
  } else {
    bidderPotTokenAccount = auctionView.myBidderPot?.info.bidderPot;
    if (!auctionView.auction.info.ended()) {
      const cancelSigners: Keypair[][] = [];
      const cancelInstr: TransactionInstruction[][] = [];
      await setupCancelBid(
        auctionView,
        accountsByMint,
        accountRentExempt,
        wallet,
        cancelSigners,
        cancelInstr,
        connection,
      );
      signers = [...signers, ...cancelSigners[0]];
      instructions = [...cancelInstr[0], ...instructions];
    }
  }

  let receivingSolAccount_or_ata = '';
  if (!ALT_SPL_MINT) {
    receivingSolAccount_or_ata = ensureWrappedAccount(
      instructions,
      cleanupInstructions,
      tokenAccount,
      wallet.publicKey,
      lamports + accountRentExempt * 2,
      signers,
    );
  } else {
    // if alternative currency is set, go for it
    const PROGRAM_IDS = programIds();
    const ata = (
      await PublicKey.findProgramAddress(
        [
          wallet.publicKey.toBuffer(),
          PROGRAM_IDS.token.toBuffer(),
          ALT_SPL_MINT.toBuffer(),
        ],
        PROGRAM_IDS.associatedToken,
      )
    )[0];
    receivingSolAccount_or_ata = pubkeyToString(ata);
    const settleInstructions: TransactionInstruction[] = [];

    const existingAta = await connection.getAccountInfo(ata);

    // create a new ATA if there is none
    console.log('Looking for existing ata?', existingAta);
    if (!existingAta) {
      createAssociatedTokenAccountInstruction(
        settleInstructions,
        toPublicKey(receivingSolAccount_or_ata),
        wallet.publicKey,
        wallet.publicKey,
        ALT_SPL_MINT,
      );
    }
  }
  const transferAuthority = approve(
    instructions,
    cleanupInstructions,
    toPublicKey(receivingSolAccount_or_ata),
    wallet.publicKey,
    lamports - accountRentExempt,
  );

  signers.push(transferAuthority);

  const bid = new BN(lamports - accountRentExempt);
  await placeBid(
    wallet.publicKey.toBase58(),
    pubkeyToString(receivingSolAccount_or_ata),
    bidderPotTokenAccount,
    auctionView.auction.info.tokenMint,
    transferAuthority.publicKey.toBase58(),
    wallet.publicKey.toBase58(),
    auctionView.auctionManager.vault,
    bid,
    instructions,
  );

  overallInstructions.push([...instructions, ...cleanupInstructions]);
  overallSigners.push(signers);
  return bid;
}
