import { PublicKey } from "@solana/web3.js";
import React, { useState } from "react";
import { useTokenList } from "../../contexts/tokenList";
import useMediaQuery, { MediaQueryKey } from 'use-media-antd-query';import {
    makeStyles,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    List,
    ListItem,
    Typography,
    Tabs,
    Tab,
  } from "@material-ui/core";
  import { ExpandMore, ImportExportRounded } from "@material-ui/icons";
import { TokenInfo } from "@solana/spl-token-registry";
import { TokenCircle } from "../Custom";

const useStyles = makeStyles((theme) => ({
    dialogContent: {
      padding: 0,
    },
    textField: {
      marginBottom: "8px",
    },
    tab: {
      minWidth: "134px",
    },
    tabSelected: {
      color: theme.palette.primary.contrastText,
      fontWeight: 700,
      backgroundColor: theme.palette.primary.main,
      borderRadius: "10px",
    },
    tabIndicator: {
      opacity: 0,
    },
    tokenButton: {
      display: "flex",
      alignItems: "center",
      cursor: "pointer",
      marginBottom: theme.spacing(1),
    },
  }));


  
export function TokenButton({
    mint,
    onClick,
}: {
    mint: PublicKey;
    onClick: () => void;
}) {
    const styles = useStyles();
    const tokenMap = useTokenList().mainnetTokens;
    let tokenInfo = tokenMap.filter(t=>t.address == mint.toBase58())[0];

    return (
    <div onClick={onClick} className={styles.tokenButton}>
        <TokenCircle iconSize={38} iconFile={tokenInfo.logoURI}/>
        <TokenName mint={mint} style={{ fontSize: 14, fontWeight: 700 }} />
        <ExpandMore />
    </div>
    );
}

export default function TokenDialog({
    open,
    onClose,
    setMint,
  }: {
    open: boolean;
    onClose: () => void;
    setMint: (mint: PublicKey) => void;
  }) {
    const [tabSelection, setTabSelection] = useState(0);
    const [tokenFilter, setTokenFilter] = useState("");
    const filter = tokenFilter.toLowerCase();
    const styles = useStyles();
    const swappableTokens  = useTokenList().mainnetTokens;
    const displayTabs = !useMediaQuery();
    const selectedTokens = swappableTokens
    let tokens =
      tokenFilter === ""
        ? selectedTokens
        : selectedTokens.filter(
            (t) =>
              t.symbol.toLowerCase().startsWith(filter) ||
              t.name.toLowerCase().startsWith(filter) ||
              t.address.toLowerCase().startsWith(filter)
          );
    return (
      <Dialog
        open={open}
        onClose={onClose}
        scroll={"paper"}
        PaperProps={{
          style: {
            borderRadius: "10px",
            width: "420px",
          },
        }}
      >
        <DialogTitle style={{ fontWeight: "bold" }}>
          <Typography variant="h6" style={{ paddingBottom: "16px" }}>
            Select a token
          </Typography>
          <TextField
            className={styles.textField}
            placeholder={"Search name"}
            value={tokenFilter}
            fullWidth
            variant="outlined"
            onChange={(e) => setTokenFilter(e.target.value)}
          />
        </DialogTitle>
        <DialogContent className={styles.dialogContent} dividers={true}>
          <List disablePadding>
            {tokens.map((tokenInfo: TokenInfo) => (
              <TokenListItem
                key={tokenInfo.address}
                tokenInfo={tokenInfo}
                onClick={(mint) => {
                  setMint(mint);
                  onClose();
                }}
              />
            ))}
          </List>
        </DialogContent>
        {displayTabs && (
          <DialogActions>
            <Tabs
              value={tabSelection}
              onChange={(e, v) => setTabSelection(v)}
              classes={{
                indicator: styles.tabIndicator,
              }}
            >
              <Tab
                value={0}
                className={styles.tab}
                classes={{ selected: styles.tabSelected }}
                label="Main"
              />
              <Tab
                value={1}
                className={styles.tab}
                classes={{ selected: styles.tabSelected }}
                label="Wormhole"
              />
              <Tab
                value={2}
                className={styles.tab}
                classes={{ selected: styles.tabSelected }}
                label="Sollet"
              />
            </Tabs>
          </DialogActions>
        )}
      </Dialog>
    );
  }

  function TokenListItem({
    tokenInfo,
    onClick,
  }: {
    tokenInfo: TokenInfo;
    onClick: (mint: PublicKey) => void;
  }) {
    const mint = new PublicKey(tokenInfo.address);
    return (
      <ListItem
        button
        onClick={() => onClick(mint)}
        style={{ padding: "10px 20px" }}
      >
        <TokenIcon mint={mint} style={{ width: "30px", borderRadius: "15px" }} />
        <TokenName mint={mint} />
      </ListItem>
    );
  }

  export function TokenIcon({ mint, style }: { mint: PublicKey; style: any }) {
    const tokenMap = useTokenList().mainnetTokens;
    let tokenInfo = tokenMap.filter(t=>t.address == mint.toBase58())[0];
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        {tokenInfo?.logoURI ? (
          <img alt="Logo" style={style} src={tokenInfo?.logoURI} />
        ) : (
          <div style={style}></div>
        )}
      </div>
    );
  }
  
  function TokenName({ mint, style }: { mint: PublicKey; style?: any }) {
    const tokenMap = useTokenList().mainnetTokens;
    let tokenInfo = tokenMap.filter(t=>t.address == mint.toBase58())[0];
  
    return (
      <Typography
        style={{
          ...style,
        }}
      >
        {tokenInfo?.symbol}
      </Typography>
    );
  }