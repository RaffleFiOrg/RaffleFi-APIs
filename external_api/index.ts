import express from 'express';
import cors from 'cors';
import { 
    GetFloorPriceResponse, 
    FloorPriceMarketplace, 
    FloorPriceError ,
    NftExcludeFilters
} from 'alchemy-sdk';
import dotenv from 'dotenv';
import { ethers, utils, constants } from 'ethers';
import { getMainnetProvider, getProvider, getSVG, isError } from './utils';
dotenv.config();

const app = express();
const corsOptions = {
    origin: '*',
    // origin: 'https://www.rafflefi.xyz'
    optionSuccessStatus: 200,
    methods: ['GET']
}

app.use(cors(corsOptions));
app.use(express.json());
app.options('*', cors());

// Get the tokenURI 
app.get('/nft_image/:address/:id/:chain', async function(req, res) {
    try {
        if (!ethers.utils.isAddress(req.params.address)) {
            res.status(500).json("Invalid address");
            return
        }

        const chainId = req.params.chain 
        const index = parseInt(chainId)
        const alchemyProvider = getProvider(index)
        if (alchemyProvider === null) {
            res.status(500).json('Invalid chain')
            return 
        }

        const metadata = await alchemyProvider.nft.getNftMetadata(req.params.address, req.params.id);
        if (metadata) {
            if (metadata.media.length > 0) {
                res.status(200).json(metadata.media[0].gateway);
            } else {
                if (metadata.rawMetadata?.image) res.status(200).json(metadata.rawMetadata.image);
            }
        } else {
            res.status(204);
        }
    } catch(error) {
        res.status(500);
    }
});

// Used to get the floor price of an NFT 
app.get('/floor_price/:address/:chain', async function(req, res) {
    try {
        if (!ethers.utils.isAddress(req.params.address)) {
            res.status(500).json("Invalid address");
            return 
        }
        const chainId = req.params.chain 
        const index = parseInt(chainId)
        const alchemyProvider = getProvider(index)
        if (alchemyProvider === null) {
            res.status(500).json('Invalid chain')
            return 
        }

        const floorPrice: GetFloorPriceResponse = await alchemyProvider?.nft.getFloorPrice(req.params.address);
        const floorPriceOpenSea: FloorPriceMarketplace | FloorPriceError = floorPrice.openSea;
        const floorPriceLooksRare: FloorPriceMarketplace | FloorPriceError = floorPrice.looksRare;
        let actualFloorPrice: number = 0;
        let actualFloorPriceCurrency: string = "";
        if (isError(floorPriceOpenSea) && isError(floorPriceLooksRare)) {
            res.status(500).json("No floor price");
            return 
        }
        if ('floorPrice' in floorPriceOpenSea) {
            actualFloorPrice = floorPriceOpenSea.floorPrice;
            actualFloorPriceCurrency = floorPriceOpenSea.priceCurrency;
        } else if ('floorPrice' in floorPriceLooksRare) {
            actualFloorPrice = floorPriceLooksRare.floorPrice;
            actualFloorPriceCurrency = floorPriceLooksRare.priceCurrency;
        }
        if (actualFloorPrice === 0) {
            res.status(500).json("No floor price");
            return 
        }
        res.status(200).json({
            floorPrice: actualFloorPrice,
            priceCurrency: actualFloorPriceCurrency
        })
    } catch(error) {
        console.log(error)
        res.status(500).json("Error");
    }
});

// get all NFTs
app.get('/nfts/:address/:chainId', async function (req, res) {
    const timeNow = new Date()
    console.log('Starting', timeNow)
    try {
        const address = req.params.address
        const chainId = req.params.chainId
    
        if (!utils.isAddress(address)) {
            res.status(500).json('Invalid address')
            return 
        }
    
        const index = parseInt(chainId)
        const provider = getProvider(index)
        if (provider === null) {
            res.status(500).json('Invalid chain')
            return 
        }
    
        const nfts = await provider?.nft.getNftsForOwner(
            address.toLowerCase(),
            {
                excludeFilters: [NftExcludeFilters.SPAM]
            }
        );
    
        if (nfts) {
            res.status(200).json(nfts.ownedNfts)
        } else {
            res.status(204)
        }
        const endTime = new Date()
        console.log('Ending', endTime)
    } catch (err) {
        console.log(err)
        res.status(500).json('Error')
    }
   
})

app.post('/tokens/specific', async function(req, res) {
    try {
        const account = req.body.account 
        const tokens = JSON.parse(req.body.tokens)
        const chain = req.body.chainId 
    
        if (!utils.isAddress(account)) {
            res.status(500).json('Invalid address')
            return 
        }

        if (tokens.length === 0) {
            res.status(204)
            return 
        }

        const provider = getProvider(parseInt(chain))
        if (provider === null) {
            res.status(500).json('Invalid chain')
            return 
        }

        const userTokens = await provider?.core.getTokenBalances(
            account.toLowerCase(), 
            tokens
        )

        res.status(200).json(userTokens)
    } catch (e) {
        console.log(e)
        res.status(500).json('Error')
    }

})

// get metadata for a token
app.get('/tokens/metadata/:address/:chainId', async function (req, res) {
    
    try {
        const address = req.params.address 
        const chainId = req.params.chainId
        
        if (!utils.isAddress(address)) {
            res.status(500).json('Invalid address')
            return 
        }
    
        const index = parseInt(chainId)
        const provider = getProvider(index)
        if (provider === null) {
            res.status(500).json('Invalid chain')
            return 
        }
    
        const metadata = await provider?.core.getTokenMetadata(address)
        res.status(200).json(metadata)
    } catch(error) {
        console.log(error)
        res.status(500)
    }
})

app.get('/tokens/balances/:address/:chainId', async function(req, res) {
    const dateBefore = new Date()
    console.log('Init', dateBefore)
    try {
        const address = req.params.address 
        const chainId = req.params.chainId
        
        if (!utils.isAddress(address)) {
            res.status(500).json('Invalid address')
            return 
        }
    
        const index = parseInt(chainId)
        const provider = getProvider(index)
        if (provider === null) {
            res.status(500).json('Invalid chain')
            return 
        }

        const balances = await provider?.core.getTokenBalances(address.toLowerCase())

        if (!balances) {
            res.status(204).json('No data')
        } else {
            let tokensOwned = []

            for (const token of balances.tokenBalances) {
                let userToken = {}

                if (token.tokenBalance === constants.HashZero) continue
                
                // Get metadata of token
                const metadata = await provider?.core.getTokenMetadata(token.contractAddress)
            
                if (!metadata?.decimals) continue

                // Compute token balance in human-readable format
                const balance = utils.formatUnits(String(token.tokenBalance?.toString()) , metadata?.decimals)
                // const logo = await getSVG(metadata.symbol?.toLowerCase())
                // console.log(logo)
                userToken = {
                    token_address: token.contractAddress,
                    name: metadata.name,
                    balance: balance,
                    decimals: metadata.decimals,
                    symbol: metadata.symbol,
                    logo: metadata.logo,
                    type: 'img'
                }

                tokensOwned.push(userToken)
            }
            const dateAfter = new Date()
            console.log('End', dateAfter)

            res.status(200).json(tokensOwned)
        }
    } catch(err) {
        console.log(err)
        res.status(500).json('Error')
    }
})

// nft metadata endpoint
app.get('/nfts/metadata/:address/:id/:chainId', async function(req, res) {
    try {
        const address = req.params.address 
        const chainId = req.params.chainId
        const id = req.params.id
        
        if (!utils.isAddress(address)) {
            res.status(500).json('Invalid address')
            return 
        }
    
        const index = parseInt(chainId)
        const provider = getProvider(index)
        if (provider === null) {
            res.status(500).json('Invalid chain')
            return 
        }
    
        const metadata = await provider?.nft.getNftMetadata(address, id)
        if (metadata.metadataError) {
            res.status(204).json('No data')
            return 
        } 
    
        if (metadata.rawMetadata) res.status(200).json(metadata.rawMetadata)
    
    } catch (err) {
        console.log(err)
        res.status(500).json('Error')
    }
})

app.listen(8001);