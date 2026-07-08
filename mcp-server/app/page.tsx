export default function Home() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 640, margin: '4rem auto', padding: '0 1rem', lineHeight: 1.6 }}>
      <h1>HireTrack MCP Server</h1>
      <p>
        This is a remote <a href="https://modelcontextprotocol.io">Model Context Protocol</a> server
        that lets Claude read and write your HireTrack job applications.
      </p>
      <p>
        Connect it as a custom connector in Claude using the MCP endpoint:
        <br />
        <code>/api/mcp</code>
      </p>
      <p>
        Sign-in is handled by your Supabase project&rsquo;s OAuth&nbsp;2.1 server (Google).
        Every request is scoped to your own account by row-level security &mdash;
        it can never see another user&rsquo;s data.
      </p>
      <p style={{ color: '#666', fontSize: 14 }}>
        There is nothing else to see here. See the README for setup.
      </p>
    </main>
  );
}
