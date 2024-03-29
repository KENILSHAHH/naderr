/** @format */

import { useState } from 'react';
import { ethers } from 'ethers';
import { create as ipfsHttpClient } from 'ipfs-http-client';
import { useRouter } from 'next/router';
import Web3Modal from 'web3modal';

const ipfsClient = require('ipfs-http-client');

const projectId = '2Lb4ThETZDCFUHWGRylVMPN6pga';
const projectSecret = '91199d5519abf17d4266f401c6d95461';
const auth =
  'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');

const client = ipfsClient.create({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  headers: {
    authorization: auth,
  },
});

import { marketplaceAddress } from '../config';

import NFTMarketplace from '../artifacts/contracts/NFTMarketplace.sol/NFTMarketplace.json';

export default function CreateItem() {
  const [fileUrl, setFileUrl] = useState(null);
  const [formInput, updateFormInput] = useState({
    price: '',
    name: '',
    description: '',
  });
  const router = useRouter();

  async function onChange(e) {
    const file = e.target.files[0];
    try {
      const added = await client.add(file, {
        progress: (prog) => console.log(`received: ${prog}`),
      });
      const url2 = await client.pin.add(added.path);
      const url = `https://ipfs.io/ipfs/${url2.string}`;
      console.log(url);
      setFileUrl(url);
    } catch (error) {
      console.log('Error uploading file: ', error);
    }
  }
  async function uploadToIPFS() {
    const { name, description, price } = formInput;
    if (!name || !description || !price || !fileUrl) return;
    /* first, upload to IPFS */
    const data = JSON.stringify({
      name,
      description,
      image: fileUrl.string,
    });
    try {
      const added = await client.add(data);
      const url2 = await client.pin.add(added.path);
      const url = `https://ipfs.io/ipfs/${url2.string}`;
      /* after file is uploaded to IPFS, return the URL to use it in the transaction */
      return url;
    } catch (error) {
      console.log('Error uploading file: ', error);
    }
  }

  async function listNFTForSale(fileUrl) {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();

    /* next, create the item */
    const price = ethers.utils.parseUnits(formInput.price, 'ether');
    let contract = new ethers.Contract(
      marketplaceAddress,
      NFTMarketplace.abi,
      signer
    );
    let listingPrice = await contract.getListingPrice();
    listingPrice = listingPrice.toString();
    console.log(price);
    console.log(listingPrice);
    let transaction = await contract.createToken(fileUrl, price, {
      value: listingPrice,
    });
    console.log(transaction);
    await transaction.wait(1);

    router.push('/');
  }

  return (
    <div className="flex justify-center">
      <div className="w-1/2 flex flex-col pb-12">
        <input
          placeholder="Asset Name"
          className="mt-8 border rounded p-4"
          onChange={(e) =>
            updateFormInput({ ...formInput, name: e.target.value })
          }
        />
        <textarea
          placeholder="Asset Description"
          className="mt-2 border rounded p-4"
          onChange={(e) =>
            updateFormInput({ ...formInput, description: e.target.value })
          }
        />
        <input
          placeholder="Asset Price in Eth"
          className="mt-2 border rounded p-4"
          onChange={(e) =>
            updateFormInput({ ...formInput, price: e.target.value })
          }
        />
        <input type="file" name="Asset" className="my-4" onChange={onChange} />
        {fileUrl && <img className="rounded mt-4" width="350" src={fileUrl} />}
        <button
          onClick={listNFTForSale}
          className="font-bold mt-4 bg-pink-500 text-white rounded p-4 shadow-lg">
          Create NFT
        </button>
      </div>
    </div>
  );
}
