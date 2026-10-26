begin;
drop policy "Read active catalog" on public.products;
drop policy "Administrators manage catalog" on public.products;
create policy "Public reads active products" on public.products for select to anon using (active);
create policy "Users read allowed products" on public.products for select to authenticated
using (active or ((select auth.jwt())->'app_metadata'->>'role') = 'catalog_admin');
create policy "Administrators insert products" on public.products for insert to authenticated
with check (((select auth.jwt())->'app_metadata'->>'role') = 'catalog_admin');
create policy "Administrators update products" on public.products for update to authenticated
using (((select auth.jwt())->'app_metadata'->>'role') = 'catalog_admin')
with check (((select auth.jwt())->'app_metadata'->>'role') = 'catalog_admin');
create policy "Administrators delete products" on public.products for delete to authenticated
using (((select auth.jwt())->'app_metadata'->>'role') = 'catalog_admin');
-- Bucket creation via SQL is supported by Supabase. File operations use Storage API only.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
commit;
