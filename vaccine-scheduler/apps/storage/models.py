from django.db import models


class FileHash(models.Model):
    """
    Tracks SHA-256 hashes of uploaded files to avoid storing duplicates in R2.
    When a file with the same hash is uploaded, we reuse the existing R2 path.
    """
    hash = models.CharField(max_length=64, unique=True, db_index=True)
    storage_path = models.CharField(max_length=500)
    original_filename = models.CharField(max_length=255)
    file_size = models.PositiveBigIntegerField()
    reference_count = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'file_hashes'

    def __str__(self):
        return f'{self.original_filename} ({self.hash[:12]}...)'
