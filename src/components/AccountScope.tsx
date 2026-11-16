/**
 * accountScope — the dropdown beside the page title: which history is on
 * screen. A borderless, link-coloured trigger that reads as part of the
 * heading (accountScope.placement); the list is the shared one.
 *
 * It holds the one account value it shares with the drawer's Account field
 * (accountScope.oneValue): "All accounts" (accountScope.all) first, then
 * accounts[].
 */
import { accountOptions } from '../spec/spec.ts';
import { ACCOUNT_SCOPE } from '../spec/copy.ts';
import { SelectDropdown } from './SelectDropdown.tsx';

const OPTIONS = [
  { id: ACCOUNT_SCOPE.default, label: ACCOUNT_SCOPE.all },
  ...accountOptions.map((account) => ({ id: account.id, label: account.label })),
];

export function AccountScope({
  value,
  onChange,
}: {
  /** The account id, or null for All accounts. */
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <SelectDropdown
      className="account-scope"
      variant="inline"
      label={ACCOUNT_SCOPE.label}
      options={OPTIONS}
      value={value ?? ACCOUNT_SCOPE.default}
      onChange={(id) => onChange(id === ACCOUNT_SCOPE.default ? null : id)}
    />
  );
}
