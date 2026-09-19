-- Check the candidate project row directly so INSERT ... RETURNING can see it.
-- The former STABLE lookup function cannot see a row inserted by its own command.
-- Preserve the existing owner-or-organization-member visibility rules.
alter policy projects_select_accessible on public.projects
using (
  user_id = auth.uid()
  or (organization_id is not null and public.is_org_member(organization_id))
);
