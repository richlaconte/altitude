import * as React from 'react';
import { cx } from './core';
import { Select, Combobox, type SelectOption } from './select';

/** A model ID is scoped to a configured provider connection; both IDs are opaque. */
export interface ModelSelection { providerId: string; modelId: string }
export interface ModelOption {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
  /** Supplying a reason also makes this option unavailable. */
  disabledReason?: string;
}
export interface ModelProvider {
  /** Identifies the configured connection, not necessarily the model's author. */
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
  models: readonly ModelOption[];
}
export interface ModelSelectorProps {
  providers: readonly ModelProvider[];
  /** null means no provider; an empty modelId means a provider was chosen but a model is still required. */
  value: ModelSelection | null;
  onValueChange: (value: ModelSelection) => void;
  loading?: boolean;
  error?: string | null;
  /** Locks the controls. A complete, available selection remains valid for sending or queueing. */
  disabled?: boolean;
  className?: string;
}
const unavailable = (option: { disabled?: boolean; disabledReason?: string }) => !!(option.disabled || option.disabledReason);

/** Why this catalog/selection cannot be dispatched, or null when it identifies an available model. No fallback. */
export function getModelSelectionError({ providers, value, loading, error }: Pick<ModelSelectorProps, 'providers' | 'value' | 'loading' | 'error' | 'disabled'>): string | null {
  if (loading) return 'Loading providers and models. Wait before sending.';
  if (error) return error;
  if (!providers.length) return 'No providers are available. Connect a provider to choose a model.';
  if (!value?.providerId) return 'Choose a provider and model before sending.';
  const provider = providers.find(p => p.id === value.providerId);
  if (!provider) return `Provider “${value.providerId}” is no longer available. Choose another provider.`;
  if (unavailable(provider)) return provider.disabledReason || `${provider.label} is unavailable. Choose another provider.`;
  if (!provider.models.length) return `${provider.label} has no models available. Choose another provider.`;
  if (!value.modelId) return 'Choose a model before sending.';
  const model = provider.models.find(m => m.id === value.modelId);
  if (!model) return `Model “${value.modelId}” is no longer available from ${provider.label}. Choose another model.`;
  if (unavailable(model)) return model.disabledReason || `${model.label} is unavailable. Choose another model.`;
  return null;
}

// Shared with the composer so its Send button and fields describe the same feedback once.
export function ModelSelectorControl({ providers, value, onValueChange, loading, error, disabled, className, feedbackId, hideFeedback = false }: ModelSelectorProps & { feedbackId?: string; hideFeedback?: boolean }) {
  const id = React.useId();
  const messageId = feedbackId ?? `${id}-feedback`;
  const reason = getModelSelectionError({ providers, value, loading, error });
  const provider = providers.find(p => p.id === value?.providerId);
  const model = provider?.models.find(m => m.id === value?.modelId);
  const locked = !!(disabled || loading || error);
  const providerInvalid = !!value?.providerId && (!provider || unavailable(provider));
  const modelInvalid = !!value?.modelId && !providerInvalid && (!model || unavailable(model));
  const providerItems: SelectOption[] = providers.map(p => ({ value: p.id, label: p.label, description: p.disabledReason || p.description, disabled: unavailable(p) }));
  // Keep restored or revoked identities visible. A missing catalog entry is never a replacement selection.
  if (value?.providerId && !provider) providerItems.unshift({ value: value.providerId, label: `${value.providerId} (unavailable)`, disabled: true });
  const modelItems: SelectOption[] = (provider?.models ?? []).map(m => ({ value: m.id, label: m.label, description: m.disabledReason || m.description, disabled: unavailable(m) }));
  if (value?.modelId && !model) modelItems.unshift({ value: value.modelId, label: `${value.modelId} (unavailable)`, disabled: true });
  const modelLocked = locked || !provider || unavailable(provider);
  return <div className={cx('alt-model-selector', className)} role="group" aria-label="Provider and model" aria-busy={loading || undefined}
    onKeyDownCapture={event => {
      // Let the IME commit natively, without letting the list interpret Enter as a choice.
      if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) event.stopPropagation();
    }}
    onKeyDown={event => {
      // The fields choose a route; Enter here must never implicitly submit an enclosing composer.
      if (event.key === 'Enter') event.preventDefault();
    }}>
    <div className="alt-model-selector-fields">
      <div className="alt-field">
        <label className="alt-field-label" htmlFor={`${id}-provider`}>Provider</label>
        <Select id={`${id}-provider`} size="sm" value={value?.providerId ?? ''} items={providerItems} placeholder="Choose a provider"
          disabled={locked} invalid={providerInvalid} aria-describedby={reason ? messageId : undefined}
          onValueChange={providerId => {
            const next = providers.find(p => p.id === providerId);
            if (!locked && next && !unavailable(next) && providerId !== value?.providerId) onValueChange({ providerId, modelId: '' });
          }} />
      </div>
      <div className="alt-field">
        <label className="alt-field-label" htmlFor={`${id}-model`}>Model</label>
        <Combobox key={JSON.stringify([value?.providerId, modelLocked])}
          id={`${id}-model`} size="sm" value={value?.modelId ?? ''} items={modelItems} placeholder="Search models…"
          empty={provider?.models.length ? 'No matching models' : 'No models available'} disabled={modelLocked} invalid={modelInvalid}
          aria-describedby={reason ? messageId : undefined}
          filter={(option, query) => `${option.label} ${option.value}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())}
          onValueChange={modelId => {
            const next = provider?.models.find(m => m.id === modelId);
            if (!modelLocked && provider && (!modelId || (next && !unavailable(next)))) onValueChange({ providerId: provider.id, modelId });
          }} />
      </div>
    </div>
    {!hideFeedback && <p id={messageId} className="alt-model-selector-feedback" role="status">{reason}</p>}
  </div>;
}

/** Two linked, labelled fields. Changing provider always requires an explicit model choice. */
export function ModelSelector(props: ModelSelectorProps) { return <ModelSelectorControl {...props} />; }
