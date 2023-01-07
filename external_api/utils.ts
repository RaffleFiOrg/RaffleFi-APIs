import dotenv from 'dotenv';
import { 
    S3Client, 
    GetObjectCommand 
} from '@aws-sdk/client-s3';
import { 
    Alchemy, 
    Network
} from 'alchemy-sdk';

dotenv.config();

export async function getSVG(tokenName: string | undefined) {
    if (!tokenName) return 

    try {
        const s3Client = new S3Client({
            credentials: {
                accessKeyId: String(process.env.AWS_ACCESS_KEY),
                secretAccessKey: String(process.env.AWS_SECRET_ACCESS_KEY),
            },
            region: process.env.AWS_REGION
        })
    
        const getParams = {
            Bucket: String(process.env.AWS_BUCKET_NAME),
            Key: `tokens/${tokenName}.svg`
        }
    
        const data = await s3Client.send(
            new GetObjectCommand(
                getParams
            )
        );
    
        const converted = await streamToString(data.Body)
        
        s3Client.destroy()
    
        return converted
    } catch (err) {
        return undefined
    } 
}

const streamToString = (stream: any) =>
    new Promise((resolve, reject) => {
    const chunks = new Array();
    stream.on("data", (chunk: string) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
});

const alchemyProviderEth = new Alchemy({
    apiKey: process.env.ALCHEMY_API_KEY_MAINNET, 
    network: Network.ETH_MAINNET,  
    maxRetries: 10
})

// The provider for alchemy 
const alchemyProvider =  new Alchemy({
    apiKey: process.env.ALCHEMY_API_KEY_PROD, 
    network: Network.ETH_GOERLI,  
    maxRetries: 10
})

const alchemyProviderPolygon = new Alchemy({
    apiKey: process.env.ALCHEMY_API_KEY_POLYGON, 
    network: Network.MATIC_MUMBAI,  
    maxRetries: 10
})

const alchemyProviderArbitrum = new Alchemy({
    apiKey: process.env.ALCHEMY_API_KEY_ARBITRUM,  
    network: Network.ARB_GOERLI, 
    maxRetries: 10
})

const providers = {
    ethMainnet: alchemyProviderEth,
    eth: alchemyProvider,
    matic: alchemyProviderPolygon,
    arb: alchemyProviderArbitrum,
}

export const getProvider = (chainId: number) : Alchemy | null => {
    switch(chainId) {
        case 1:
            return providers.ethMainnet
        case 5:
            return providers.eth
        case 137:
            return providers.matic
        case 80001:
            return providers.matic
        case 42161:
            return providers.arb
        case 421613:
            return providers.arb
        default:
            return null 
    }
}

export const getMainnetProvider = () : Alchemy => {
    return providers.ethMainnet
}

export const isError = (obj: Object) => {
    return 'error' in obj;
}