# 🥬 FERMENT — The Ferment-to-Earn Game

**Farm. Ferment. Earn $FERMENT.**

A pixel farming and cooking game where players grow ingredients, craft kimchi recipes, and ferment batches in real time to earn $FERMENT.

Follow along on X: [@PlayFerment](https://x.com/PlayFerment)

## What's in this repo

```
index.html        Landing page and playable game
style.css         All styles (light and dark themes)
main.js           Hero demo, flywheel, tokenomics graphic, Solana wallet connect
game.js           The playable game (farm, kitchen, barrels, market, upgrades)
ferment-logo.png  Pixel-art kimchi jar logo (transparent)
favicon.png       64×64 favicon
```

Every file sits at the repo root, with no subfolders.

No build step. It's plain HTML, CSS and JavaScript.

## Run it locally

Open `index.html` in a browser, or serve the folder (recommended, so wallet extensions inject normally):

```bash
npx serve .
# or
python3 -m http.server 8000
```

## Deploy on Vercel

1. Push this repo to GitHub.
2. In Vercel, choose **Add New → Project** and import the repo.
3. Set **Framework Preset** to **Other**. Leave the build command and output directory empty (the root directory is `./`).
4. Deploy. Vercel serves `index.html` from the root.

Or from the command line: `npx vercel` in this folder.

## Wallet connect

`main.js` uses [`@solana/web3.js`](https://github.com/solana-labs/solana-web3.js) 1.95.3 (loaded from jsDelivr, pinned to an exact version) and detects Phantom, Solflare and Backpack. On connect it validates the address with `PublicKey`, shows the shortened address, and offers copy and disconnect. It silently reconnects to a wallet the user has already trusted.

The site only reads the public address. To read balances or send transactions, add an RPC connection, for example:

```js
const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('devnet'));
const lamports = await connection.getBalance(pubkey);
```

## The game

- **Farm:** napa cabbage, chili, garlic, radish and scallion, each with its own grow time.
- **Kitchen:** six recipes from Common to Legendary. Rare recipes unlock with factory tiers.
- **Barrels:** one in-game day passes every 12.5 seconds. Quality rises from Fresh (1×) to Tangy, Aged, Deep aged and Legendary (4×) at day 24. Batches keep fermenting while the page is closed.
- **Market:** sell finished kimchi or fill three daily restaurant orders.
- **Upgrades:** farmland, barrels and three factory tiers that produce kimchi automatically.
- **Tokenomics:** every upgrade burns 50%, returns 30% to a capped reward pool and sends 20% to treasury. All sales are paid out of the capped pool.

Progress is saved in `localStorage`, with a separate save per connected wallet. In this version $FERMENT balances are in-game only; nothing is written on-chain.

## Tuning

Game balance lives at the top of `game.js`: `DAY_MS`, `POOL_CAP`, `CROPS`, `RECIPES`, `FACTORY`, and the `plotCost` and `barrelCost` curves.

---

$FERMENT is an in-game token. Nothing in this project is financial advice.
