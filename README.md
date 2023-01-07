# RaffleFi-APIs

APIs in use by the RaffleFi protocol

| Service | Folder |  Description |
| - |-|-|
| API | internal_api | Private API that talks only with frontend and RDS. Only one POST endpoint to save signature tickets. |
| External API | external_api | An API with external connectivity which talks to Alchemy. Used to get floor prices and NFT images. |

## Installation

Change to the directory of the API you want to setup then install the dependencies with:

`yarn` or `npm install`

## Run 

`yarn start`