import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
solidity: {
version: "0.8.24",
settings: {
optimizer: {
enabled: true,
runs: 200,
},
},
},
networks: {
sepolia: {
url: `https://sepolia.infura.io/v3/0edba6f286b948db93554a13444736c2`,
accounts: ["32fae24e5a5e549ec9131f0215773cc14f066856fe0b3d128002437a19520529"],
},
},
etherscan: {
apiKey: {
sepolia: "9M7WWI9SSM7M4K1Y16MUE8THX6FHB77I1J",
},
},
};

export default config;
