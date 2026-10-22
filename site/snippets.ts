// The code shown on the landing page. "Avatar", "useArrival" and "Await" are trimmed from project/components/src, keeping the
// lines that do the work; if those change, update these.

export const yourCode = `// Written the way you would anyway. While a query loads its data is undefined,
// and each component shows its own skeleton until it isn't.
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

export const insideAvatar = `export function Avatar({ skeleton, ...props }: AvatarProps) {
  // undefined: your data hasn't arrived yet. (null would mean there's no one.)
  const missing = skeleton !== false && props.name === undefined;
  useReportWaiting(missing);            // tells its Card, so optional parts wait with it
  const arrival = useArrival(missing);  // a promise that resolves once name turns up

  // Never waited: the plain path, exactly as before.
  if (!useHasWaited(missing)) return <AvatarFace {...props} />;

  // Waiting: hold a boundary whose fallback is this avatar's own imprint,
  // a disc of the same size, so nothing moves when the face lands.
  const size = props.size ?? 36;
  return (
    <Await inline shape="circle"
      imprint={<span className="alt-skeleton" data-shape="circle" style={{ width: size, height: size }} />}>
      <Arrive when={arrival}>
        <AvatarFace {...props} />
      </Arrive>
    </Await>
  );
}`;

export const arrivalCode = `// "Not here yet" becomes a suspension, so React's own Suspense boundary
// (inside the component) shows the imprint, and the same reveal runs
// whether you passed undefined or a promise.
export function useArrival(waiting: boolean) {
  const pending = React.useRef(null);
  if (waiting && !pending.current) {
    let done;
    pending.current = { promise: new Promise((r) => (done = r)), done };
  }
  const current = pending.current;
  React.useLayoutEffect(() => {
    // Your data arrived: let the suspended part render.
    if (!waiting && current) { current.done(); pending.current = null; }
  });
  return waiting ? current.promise : null;
}

export function Arrive({ when, children }) {
  if (when) readPromised(when);   // React 19's use(); the same contract by hand on 18
  return children;
}`;

export const insideAwait = `export function Await({ imprint, shape, inline, enabled = true, children }: AwaitProps) {
  const group = React.useContext(GroupContext);       // a RevealGroup, if there is one
  const box = React.useRef({ id: {}, since: null });
  if (!enabled) return <>{children}</>;                // skeleton={false}: suspend to your boundary

  return (
    <React.Suspense fallback={<Imprint box={box} group={group}>{imprint}</Imprint>}>
      <Landed box={box} group={group} shape={shape} inline={inline}>{children}</Landed>
    </React.Suspense>
  );
}

// Imprint notes when it mounted. CSS holds it invisible for dur-grace (300ms),
// so a fast load never flashes a skeleton.
//
// Landed runs on commit:
//   the imprint never showed  → appear in place, no motion
//   it did                    → rise 8px out of it while it fills in behind,
//                               staggered by riseDelay(): four rises at a time
//   inside a RevealGroup      → stay an imprint until the slowest part lands`;

export const install = `npm install altitude-design`;

export const quickStart = `import { AltitudeProvider, Button, Field, Input } from 'altitude-design';
import 'altitude-design/altitude.css';

export function App() {
  return (
    <AltitudeProvider scheme="daylight">
      <Field label="Workspace name"><Input placeholder="Northwind Studio" /></Field>
      <Button variant="primary">Save changes</Button>
    </AltitudeProvider>
  );
}`;
