import {
  TokenAccount,
  cancelBid,
  cache,
  ensureWrappedAccount,
  sendTransactionWithRetry,
  AuctionState,
  SequenceType,
  sendTransactions,
  ParsedAccount,
  BidderMetadata,
  StringPublicKey,
  WalletSigner,
  toPublicKey,
  createAssociatedTokenAccountInstruction,
  programIds,
  pubkeyToString,
} from '@oyster/common';
import { AccountLayout } from '@solana/spl-token';
import {
  TransactionInstruction,
  Keypair,
  Connection,
  PublicKey,
} from '@solana/web3.js';
import { AuctionView } from '../hooks';
import {
  BidRedemptionTicket,
  PrizeTrackingTicket,
} from '@oyster/common/dist/lib/models/metaplex/index';
import { claimUnusedPrizes } from './claimUnusedPrizes';
import { setupPlaceBid } from './sendPlaceBid';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { ALT_SPL_MINT } from '@oyster/common';

export async function sendCancelBid(
  connection: Connection,
  wallet: WalletSigner,
  payingAccount: StringPublicKey,
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
  bids: ParsedAccount<BidderMetadata>[],
  bidRedemptions: Record<string, ParsedAccount<BidRedemptionTicket>>,
  prizeTrackingTickets: Record<string, ParsedAccount<PrizeTrackingTicket>>,
) {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const signers: Array<Keypair[]> = [];
  const instructions: Array<TransactionInstruction[]> = [];

  if (
    auctionView.auction.info.ended() &&
    auctionView.auction.info.state !== AuctionState.Ended
  ) {
    await setupPlaceBid(
      connection,
      wallet,
      payingAccount,
      auctionView,
      accountsByMint,
      0,
      instructions,
      signers,
    );
  }

  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span,
  );

  await setupCancelBid(
    auctionView,
    accountsByMint,
    accountRentExempt,
    wallet,
    signers,
    instructions,
    connection,
  );

  if (
    wallet.publicKey.equals(
      toPublicKey(auctionView.auctionManager.authority),
    ) &&
    auctionView.auction.info.ended()
  ) {
    await claimUnusedPrizes(
      connection,
      wallet,
      auctionView,
      accountsByMint,
      bids,
      bidRedemptions,
      prizeTrackingTickets,
      signers,
      instructions,
    );
  }

  instructions.length === 1
    ? await sendTransactionWithRetry(
        connection,
        wallet,
        instructions[0],
        signers[0],
        'single',
      )
    : await sendTransactions(
        connection,
        wallet,
        instructions,
        signers,
        SequenceType.StopOnFailure,
        'single',
      );
}

export async function setupCancelBid(
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
  accountRentExempt: number,
  wallet: WalletSigner,
  signers: Array<Keypair[]>,
  instructions: Array<TransactionInstruction[]>,
  connection: Connection,
) {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const cancelSigners: Keypair[] = [];
  const cancelInstructions: TransactionInstruction[] = [];
  const cleanupInstructions: TransactionInstruction[] = [];

  const tokenAccount = accountsByMint.get(auctionView.auction.info.tokenMint);
  const mint = cache.get(auctionView.auction.info.tokenMint);

  if (mint && auctionView.myBidderPot) {
    let receivingSolAccount_or_ata = '';
    if (!ALT_SPL_MINT) {
      receivingSolAccount_or_ata = ensureWrappedAccount(
        cancelInstructions,
        cleanupInstructions,
        tokenAccount,
        wallet.publicKey,
        accountRentExempt,
        cancelSigners,
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
      const settleInstructions: TransactionInstruction[] = [];
      receivingSolAccount_or_ata = pubkeyToString(ata);
      const existingAta = await connection.getAccountInfo(ata);

      // create a new ATA if there is none
      console.log('Looking for existing ata?', existingAta);
      if (!existingAta) {
        createAssociatedTokenAccountInstruction(
          settleInstructions,
          new PublicKey(receivingSolAccount_or_ata),
          wallet.publicKey,
          wallet.publicKey,
          ALT_SPL_MINT,
        );
      }
    }

    await cancelBid(
      wallet.publicKey.toBase58(),
      pubkeyToString(receivingSolAccount_or_ata),
      auctionView.myBidderPot.info.bidderPot,
      auctionView.auction.info.tokenMint,
      auctionView.vault.pubkey,
      cancelInstructions,
    );
    signers.push(cancelSigners);
    instructions.push([...cancelInstructions, ...cleanupInstructions]);
  }
}
