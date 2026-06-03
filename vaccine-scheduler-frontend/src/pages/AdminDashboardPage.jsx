  async function handleAdFormSubmit(e) {
    e.preventDefault();
    setAdFormLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', adFormData.title);
      formData.append('link_url', adFormData.link_url);
      formData.append('position', adFormData.position);
      formData.append('is_active', adFormData.is_active ? 'true' : 'false');
      formData.append('order', adFormData.order);
      
      // Only append dates if they have values to avoid validation errors on empty strings
      if (adFormData.start_date && adFormData.start_date.trim()) {
        formData.append('start_date', new Date(adFormData.start_date).toISOString());
      }
      if (adFormData.end_date && adFormData.end_date.trim()) {
        formData.append('end_date', new Date(adFormData.end_date).toISOString());
      }
      
      if (adFormData.image instanceof File) {
        formData.append('image', adFormData.image);
      }

      let response;
      if (adFormData.id) {
        response = await adminApi.updateAdminAd(adFormData.id, formData);
      } else {
        response = await adminApi.createAdminAd(formData);
      }
      
      setAdFormOpen(false);
      setAdFormData(null);
      fetchTabData('ads', search, 1, filters.ads || {}, ordering);
    } catch (err) {
      // Log full error details for debugging
      console.error('Ad save error:');
      console.error('Status:', err.response?.status);
      console.error('Data:', err.response?.data);
      console.error('Headers:', err.response?.headers);
      
      // Display detailed error to admin
      const errorMsg = err.response?.data?.image?.[0] 
        || err.response?.data?.detail 
        || err.response?.data?.start_date?.[0]
        || err.response?.data?.end_date?.[0]
        || err.response?.data?.is_active?.[0]
        || Object.values(err.response?.data || {})
          .flat()
          .find(msg => typeof msg === 'string')
        || 'Failed to save advertisement.';
      
      alert(`Error: ${errorMsg}`);
    } finally {
      setAdFormLoading(false);
    }
  }