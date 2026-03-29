const GRAPHQL_ENDPOINT = 'https://api.indexer.xyz/graphql';
const COSMO_COLLECTION_ID = '215d2552-e25f-4f27-b5c6-e2a917b61331';

function getHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-api-key': process.env.NEXT_PUBLIC_TRADEPORT_API_KEY ?? '',
    'x-api-user': process.env.NEXT_PUBLIC_TRADEPORT_API_USER ?? '',
  };
}

/** Resolve the COSMO collection ID.
 *  Uses env var override first, then the hardcoded confirmed ID. */
function getCollectionId(): string {
  return process.env.NEXT_PUBLIC_TRADEPORT_COLLECTION_ID ?? COSMO_COLLECTION_ID;
}

/**
 * Check if a wallet holds at least one COSMO NFT.
 *
 * Tradeport stores Supra native addresses (0x + 64 hex), while StarKey
 * returns EVM addresses (0x + 40 hex). The EVM address is always a prefix
 * of the native address, so we query with _ilike + wildcard suffix.
 */
export async function checkCosmoNFTHolder(
  walletAddress: string
): Promise<{ isHolder: boolean; count: number }> {
  try {
    const collectionId = getCollectionId();

    // Treat as pure string — no trim/slice/parseInt/BigInt/Number.
    // Leading zeros after 0x must be preserved (e.g. 0x0a05... must NOT become 0xa05...).
    // Pad hex part to 64 chars so 0x0a... stays 0x0a... and not 0xa...
    const hexPart = walletAddress.replace(/^0x/i, '');
    const paddedHex = hexPart.padStart(64, '0');
    const nativeAddr = ('0x' + paddedHex).toLowerCase();
    const ownerPattern = nativeAddr + '%';

    console.log('[NFTGate] walletAddress (raw input):', walletAddress);
    console.log('[NFTGate] nativeAddr (padded, no trim/slice):', nativeAddr);
    console.log('[NFTGate] ownerPattern (_ilike):', ownerPattern);

    const query = `{
      supra {
        nfts(
          where: {
            collection_id: { _eq: "${collectionId}" }
            owner: { _ilike: "${ownerPattern}" }
          }
          limit: 100
        ) { id token_id owner }
      }
    }`;
    console.log('[NFTGate] collectionId:', collectionId);
    console.log('[NFTGate] query:', query);

    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ query }),
    });

    console.log('[NFTGate] HTTP status:', res.status, res.statusText);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn('[NFTGate] Non-OK response body:', errText);
      return { isHolder: false, count: 0 };
    }

    const json = await res.json();
    console.log('[NFTGate] API response:', JSON.stringify(json, null, 2));

    if (json?.errors) {
      console.warn('[NFTGate] GraphQL errors:', json.errors);
      return { isHolder: false, count: 0 };
    }

    const nfts: unknown[] = json?.data?.supra?.nfts ?? [];
    console.log('[NFTGate] NFTs found:', nfts.length, nfts);
    return { isHolder: nfts.length > 0, count: nfts.length };
  } catch (err) {
    console.error('[NFTGate] Exception:', err);
    return { isHolder: false, count: 0 };
  }
}
