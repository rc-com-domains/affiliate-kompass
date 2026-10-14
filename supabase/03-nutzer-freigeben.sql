-- Replace only the placeholder with the email of your confirmed Auth user.
insert into public.affiliate_members(user_id) select id from auth.users where lower(email)=lower('DEINE-ANMELDE-EMAIL') on conflict do nothing;
-- Must return one row:
select u.email from public.affiliate_members m join auth.users u on u.id=m.user_id;
