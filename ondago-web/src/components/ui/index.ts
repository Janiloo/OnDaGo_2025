/**
 * Sabako UI kit — import everything from here:
 *   import { Button, Card, PageHeader, Table, TR, TD } from "../components/ui";
 *
 * These primitives exist so a page never hand-rolls a card/button/table again.
 * See /ui in the running app for a live catalogue of every variant.
 */
export { Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";

export { Card, CardHeader, PageHeader, SectionTitle, StatCard } from "./Card";

export { Field, Textarea, Select, FormRow } from "./Form";
export type { FieldProps, TextareaProps, SelectProps } from "./Form";

export { Badge, Alert, EmptyState, Skeleton } from "./Feedback";
export type { Tone } from "./Feedback";

export { Table, THead, TBody, TR, TH, TD, CellSub, RowActions } from "./Table";
