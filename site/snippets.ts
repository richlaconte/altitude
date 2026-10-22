// The code shown on the landing page. "Inside Avatar" and "Await" are trimmed from project/components/src, keeping the
// lines that do the work; if those change, update these.

export const yourCode = `// app/team/[id]/page.tsx: a server component.
// Start the requests; don't await them. Each part waits for its own data.
export default function Member({ id }: { id: string }) {
  const user = getUser(id);
  const deploys = getDeploys(id);

  return (
    <>
      <Card>
        <CardHeader>
          <Avatar name={user.then((u) => u.name)} size={44} status="active" />
          <CardTitle>{user.then((u) => u.name)}</CardTitle>
          <CardDescription>{user.then((u) => u.role)}</CardDescription>
          <Badge tone="positive">{user.then((u) => u.status)}</Badge>
        </CardHeader>
        <CardContent>
          <LatestNote userId={id} /> {/* yours: it suspends, the card imprints its body */}
        </CardContent>
      </Card>
      <DataTable columns={columns} rows={deploys} getRowId={(d) => d.id} />
    </>
  );
}`;

export const insideAvatar = `export function Avatar({ skeleton, ...props }: AvatarProps) {
  // Plain values take the old path: no boundary, no extra element.
  if (!isPromise(props.name) && !isPromise(props.src)) return <AvatarFace {...props} />;

  // A promise: hold a boundary whose fallback is this avatar's own imprint,
  // a disc of the same size, so nothing moves when the face lands.
  const size = props.size ?? 36;
  return (
    <Await inline shape="circle" enabled={skeleton !== false}
      imprint={<span className="alt-skeleton" data-shape="circle" style={{ width: size, height: size }} />}>
      <AvatarLanded {...props} />
    </Await>
  );
}

function AvatarLanded(props: AvatarProps) {
  // Suspends until both have landed.
  return <AvatarFace {...props} name={readPromised(props.name)} src={readPromised(props.src)} />;
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

export const readPromisedCode = `const use = (React as any).use;   // React 19

export function readPromised<T>(value: T | PromiseLike<T>): T {
  if (!isPromise(value)) return value;
  if (use) return use(value);

  // React 18 has no use(): keep the same contract by hand. Throw the
  // promise to the nearest Suspense boundary and remember how it settled.
  let r = settled.get(value);
  if (!r) {
    r = { status: 'pending' };
    settled.set(value, r);
    value.then((v) => { r.status = 'done'; r.value = v; },
               (e) => { r.status = 'error'; r.error = e; });
  }
  if (r.status === 'done') return r.value;
  if (r.status === 'error') throw r.error;   // to your error boundary
  throw value;                              // to the nearest Suspense
}`;

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
