import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { AltitudeProvider, Surface } from '../../../project/components/src/core';
import { Field, Input } from '../../../project/components/src/controls';
import { Select } from '../../../project/components/src/select';
import { Dialog } from '../../../project/components/src/overlays';
function Fixture() {
  const [count, setCount] = React.useState(0);
  const [nested, setNested] = React.useState(0);
  const [error, setError] = React.useState(true);
  const [disabled, setDisabled] = React.useState(false);
  const [resetControlled, setResetControlled] = React.useState(false);
  const [controlled, setControlled] = React.useState('a');
  const items = [{value: 'a', label: 'Alpha'}, {value: 'b', label: 'Beta'}, {value: 'c', label: 'Unavailable', disabled: true}];
  return <AltitudeProvider>
    <output id="count">{count}</output><output id="nested-count">{nested}</output>
    <Surface id="surface" interactive onClick={() => setCount(n => n + 1)}>Open record</Surface>
    <Surface id="link" as="a" href="#record" interactive onClick={() => setCount(n => n + 1)}>Record link</Surface>
    <Surface id="disabled-link" as="a" href="#disabled-navigation" interactive disabled>Unavailable record link</Surface>
    <Surface id="native" as="button" interactive onClick={() => setCount(n => n + 1)}>Native record</Surface>
    <Surface id="nested" interactive onClick={() => setCount(n => n + 1)}>Record <button onClick={() => setNested(n => n + 1)}>Nested action</button></Surface>
    <Surface id="cancelled" interactive onKeyDown={e => e.preventDefault()} onClick={() => setCount(n => n + 1)}>Cancelled</Surface>
    <Surface id="disabled" interactive aria-disabled="true" onClick={() => setCount(n => n + 1)}>Disabled</Surface>
    <p id="external">External description</p>
    <Field label="Title" hint="Helpful hint" error={error ? 'Fix this value' : undefined}><Input aria-describedby="external external" required /></Field>
    <button id="toggle-error" onClick={() => setError(e => !e)}>Toggle error</button>
    <form id="unnamed-form"><Select id="unnamed" required items={[...items, {value: "", label: "No choice"}]} /></form>
    <button id="reset-controlled" onClick={() => setResetControlled(true)}>Reset controlled state too</button>
    <form id="form" onReset={() => { if (resetControlled) setControlled('a'); }} onSubmit={e => e.preventDefault()}>
      <Field label="Choice" required><Select id="choice" name="choice" items={items} disabled={disabled} requiredMessage="Choose a record." /></Field>
      <Field label="Default choice"><Select id="default-choice" name="default" defaultValue="a" items={items} /></Field>
      <Field label="Controlled choice"><Select id="controlled-choice" name="controlled" value={controlled} onValueChange={setControlled} items={items} /></Field>
      <button type="reset" id="reset">Reset choices</button><button type="submit" id="submit">Save choices</button>
    </form>
    <button id="disable-choice" onClick={() => setDisabled(d => !d)}>Toggle disabled</button>
    <Dialog trigger={<button id="open-dialog">Open dialog</button>} title="Sparse dialog" />
    <Dialog trigger={<button id="open-empty">Open empty dialog</button>} title="Empty dialog" initialFocus={false} dismissible={false} />
  </AltitudeProvider>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
