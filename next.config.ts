/* eslint-disable @typescript-eslint/no-explicit-any */

const nextConfig: any = {
  // Required for Docker/Railway deployment — produces a minimal standalone server
  output: "standalone",
  // pdf-parse is a CJS module that Next.js cannot bundle — keep it as an external
  serverExternalPackages: ["pdf-parse", "mammoth"],
  allowedDevOrigins: [
    "ais-dev-7uedazwr7guelxnhvmteid-471196200577.europe-west2.run.app",
    "*.run.app",
  ],
  async redirects() {
    return [
      {
        source: "/pricing",
        destination: "/?page=pricing",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
