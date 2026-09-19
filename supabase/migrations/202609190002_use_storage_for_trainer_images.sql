begin;

do $$
declare
  storage_object_paths constant text[] := array[
    'team/trainer-1.png',
    'team/trainer-2.png',
    'team/trainer-3.png'
  ];
begin
  if not exists (
    select 1
    from storage.buckets
    where id = 'trainer-images'
      and public = true
  ) then
    raise exception using message =
      'The public trainer-images bucket is required before running this migration.';
  end if;

  if (
    select count(*)
    from storage.objects
    where bucket_id = 'trainer-images'
      and name = any(storage_object_paths)
  ) <> 3 then
    raise exception using message =
      'Upload trainer-1.png, trainer-2.png, and trainer-3.png to trainer-images/team before running this migration.';
  end if;

  if (
    select count(*)
    from public.trainers
  ) <> 3 then
    raise exception using message =
      'Expected exactly three trainer rows before updating their image paths.';
  end if;

  if exists (
    select required.display_order
    from (values (1), (2), (3)) as required(display_order)
    left join public.trainers as trainers
      on trainers.display_order = required.display_order
    group by required.display_order
    having count(trainers.id) <> 1
  ) then
    raise exception using message =
      'Expected one trainer at each display_order 1, 2, and 3; no rows were changed.';
  end if;

  if exists (
    select 1
    from public.trainers as trainers
    join (values
      (1, 'team/trainer-1.png'),
      (2, 'team/trainer-2.png'),
      (3, 'team/trainer-3.png')
    ) as expected(display_order, image_url)
      on expected.display_order = trainers.display_order
    where trainers.image_url not in (
      'assets/images/trainer-team.png',
      expected.image_url
    )
  ) then
    raise exception using message =
      'A trainer image_url has an unexpected value; no rows were changed.';
  end if;

  update public.trainers as trainers
  set
    image_url = storage_images.image_url,
    image_position_percent = 50
  from (values
    (1, 'team/trainer-1.png'),
    (2, 'team/trainer-2.png'),
    (3, 'team/trainer-3.png')
  ) as storage_images(display_order, image_url)
  where trainers.display_order = storage_images.display_order
    and (
      trainers.image_url is distinct from storage_images.image_url
      or trainers.image_position_percent is distinct from 50
    );
end;
$$;

commit;
