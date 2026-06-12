# Backend tasks for Employees section

## Role and access

- Add/sync an HR role for access to the Employees section.
- Frontend currently uses `UserRole.HR = 6`; backend must either support this role id or return the final agreed id in auth payload.
- HR users must be allowed to work with employees endpoints.
- Employees are a separate payroll/HR entity and must not reuse or extend the existing Users table.

## Employees API

- `GET /api/employees`
  - Return either an array of employees or `{ employees: [...] }`.
  - Return fields used by the frontend:
    - `id`
    - `unit`
    - `department`
    - `subdivision`
    - `position`
    - `full_name`
    - `accounting_full_name`
    - `local_full_name`
    - `payment_form`
    - `payment_details`
    - `tax_id`
    - `contacts`
    - `manager`
    - `hire_date`
    - `termination_date`
  - If profile history is returned with the employee, use `history`, `profile_history`, or `audit_log`.
- `POST /api/employees`
  - Create employee from manual form.
  - Accept all employee fields above plus `creation_source: "manual"`.
  - After successful creation, create Employee Profile.
- `PUT /api/employees/:id`
  - Update employee profile fields.
  - Log changed fields.
- `POST /api/employees/import`
  - Frontend sends parsed valid rows as JSON, not the uploaded file.
  - Accept `{ creation_source: "import", employees: [...] }`.
  - Import valid records and return:
    - `imported`
    - `skipped_duplicates`
    - `errors`

## Validation and duplicates

- Reject create/update without required fields:
  - `tax_id`
  - `accounting_full_name`
  - `local_full_name`
  - `payment_form`
  - `hire_date`
- Validate `tax_id` according to backend business rules.
- Enforce uniqueness of `tax_id`.
- Check duplicate combination `tax_id + accounting_full_name`.
- Return `409 Conflict` for full duplicates.
- Return duplicate/similarity metadata for import rows where applicable.
- Similar-name warning can be calculated on backend for imports if backend has better matching rules; frontend already shows a basic warning from loaded employees.

## Employee Profile and audit

- Store in Employee Profile:
  - all employee fields;
  - creation source: `manual` or `import`;
  - creation date;
  - creation author from auth token.
- Log:
  - who created employee;
  - when employee was created;
  - source: `manual` or `import`;
  - main card changes during updates.

## Import file support

- Current frontend supports CSV/TSV parsing and sends parsed JSON rows to backend.
- If XLSX import is required, either:
  - add frontend XLSX parsing, or
  - provide a dedicated backend file upload/import endpoint.
