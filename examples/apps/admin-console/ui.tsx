// Pieces every section of the admin console uses: a read's states and error words, shared by every example app.
import { DemoResource, errorMessage, isDemoError } from '../shared/react';

export const Resource = DemoResource;
export const message = errorMessage;
export const isKind = isDemoError;
