export const metadata = {
  title: 'HireTrack MCP Server',
  description: 'Remote MCP server for HireTrack job applications.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
