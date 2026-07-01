INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit
)
VALUES
(
    'listing-images',
    'listing-images',
    true,
    5242880
),
(
    'listing-documents',
    'listing-documents',
    true,
    26214400
)
ON CONFLICT (id) DO NOTHING;