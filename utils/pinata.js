// utils/pinata.js
import axios from "axios";

// Pinata API credentials - store these in .env.local
const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY;
const PINATA_API_URL = process.env.NEXT_PUBLIC_PINATA_API_URL;

// Upload file to IPFS via Pinata
export const uploadFileToPinata = async (file) => {
  if (!file) return null;

  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await axios.post(
      `${PINATA_API_URL}/pinning/pinFileToIPFS`,
      formData,
      {
        maxBodyLength: "Infinity",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_API_KEY,
        },
      }
    );

    return {
      success: true,
      ipfsHash: res.data.IpfsHash,
      pinataUrl: `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`,
      pinataGatewayUrl: `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`,
    };
  } catch (error) {
    console.error("Error uploading file to Pinata:", error);
    return {
      success: false,
      message: error.message || "Failed to upload file to IPFS",
    };
  }
};

// Upload multiple files to IPFS via Pinata
export const uploadMultipleFilesToPinata = async (files) => {
  if (!files || files.length === 0) return [];

  try {
    const uploadPromises = Array.from(files).map((file) =>
      uploadFileToPinata(file)
    );
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error("Error uploading multiple files to Pinata:", error);
    return [];
  }
};

// Upload JSON metadata to IPFS via Pinata
export const uploadJSONToPinata = async (jsonData, name) => {
  try {
    const data = JSON.stringify({
      pinataOptions: {
        cidVersion: 1,
      },
      pinataMetadata: {
        name: name || "Property Metadata",
      },
      pinataContent: jsonData,
    });

    const res = await axios.post(
      `${PINATA_API_URL}/pinning/pinJSONToIPFS`,
      data,
      {
        headers: {
          "Content-Type": "application/json",
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_API_KEY,
        },
      }
    );

    return {
      success: true,
      ipfsHash: res.data.IpfsHash,
      pinataUrl: `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`,
      ipfsUri: `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`,
    };
  } catch (error) {
    console.error("Error uploading JSON to Pinata:", error);
    return {
      success: false,
      message: error.message || "Failed to upload metadata to IPFS",
    };
  }
};

// Create property metadata and upload to IPFS
export const createAndUploadPropertyMetadata = async (
  propertyData,
  imageFiles
) => {
  try {
    // First upload all image files
    const uploadedImages = await uploadMultipleFilesToPinata(imageFiles);

    // Filter out failed uploads and get the IPFS hashes
    const successfulImageUploads = uploadedImages.filter(
      (upload) => upload.success
    );
    const imageHashes = successfulImageUploads.map(
      (upload) => `https://gateway.pinata.cloud/ipfs/${upload.ipfsHash}`
    );

    // Create metadata object
    const metadata = {
      title: propertyData.title,
      description: propertyData.description,
      location: propertyData.location,
      images: imageHashes,
      virtualTour: propertyData.virtualTour || "",
      attributes: [
        {
          trait_type: "Property Type",
          value: propertyData.propertyType || "Residential",
        },
        {
          trait_type: "Bedrooms",
          value: propertyData.bedrooms || 0,
        },
        {
          trait_type: "Bathrooms",
          value: propertyData.bathrooms || 0,
        },
        {
          trait_type: "Area",
          value: propertyData.area || 0,
          unit: "sq ft",
        },
      ],
      createdAt: new Date().toISOString(),
    };

    // Upload the metadata to IPFS
    const metadataUpload = await uploadJSONToPinata(
      metadata,
      `Property - ${propertyData.title}`
    );

    if (!metadataUpload.success) {
      throw new Error(metadataUpload.message || "Failed to upload metadata");
    }

    return {
      success: true,
      metadataIpfsHash: metadataUpload.ipfsHash,
      metadataUri: metadataUpload.ipfsUri,
      imageIpfsHashes: successfulImageUploads.map((img) => img.ipfsHash),
    };
  } catch (error) {
    console.error("Error creating and uploading property metadata:", error);
    return {
      success: false,
      message: error.message || "Failed to create and upload property metadata",
    };
  }
};
