// The code shown on the landing page.

export const yourCode = `// No loading flags: undefined means "not here yet".
function Member({ id }: { id: string }) {
  const { data: user } = useQuery(userQuery(id));
  const { data: presence } = useQuery(presenceQuery(id));
  const { data: deploys } = useQuery(deploysQuery(id));

  return (
    <>
      <Card>
        <CardHeader>
          <Avatar name={user?.name} size={44} status="active" />
          <CardTitle>{user?.name}</CardTitle>
          <CardDescription>{user?.role}</CardDescription>
          <Badge tone="positive">{presence?.label}</Badge>
        </CardHeader>
        <CardContent>{user?.bio}</CardContent>
      </Card>
      <DataTable columns={columns} rows={deploys} getRowId={(d) => d.id} />
    </>
  );
}`;

const install = `npm install altitude-design`;

export const installTabs = [
  { label: 'npm', language: 'sh', code: install },
  { label: 'pnpm', language: 'sh', code: 'pnpm add altitude-design' },
  { label: 'yarn', language: 'sh', code: 'yarn add altitude-design' },
];

export const agentSetup = `# Preview the change, then apply it
npx altitude init --client claude
npx altitude init --client claude --apply
# Codex: --client codex. Both: --client all.`;

export const quickStart = `import { AltitudeProvider, Button, Field, Input } from 'altitude-design';
import 'altitude-design/altitude.css';

export function App() {
  return (
    <AltitudeProvider scheme="daylight">
      <Field label="Workspace name"><Input placeholder="Larkspur Studio" /></Field>
      <Button variant="primary">Save changes</Button>
    </AltitudeProvider>
  );
}`;
