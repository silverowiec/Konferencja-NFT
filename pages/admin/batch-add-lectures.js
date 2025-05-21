import React, { useState } from 'react';
import Layout from '../../components/common/Layout';

// Helper to fetch all metadata files from IPFS folder hash
async function fetchIpfsMetadataFolder(folderHash, count = 20) {
  const files = [];
  for (let i = 0; i < count; i++) {
    const url = `https://gateway.pinata.cloud/ipfs/${folderHash}/IOEC2025.POAP_${i}.json`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      files.push({
        ...data,
        _filename: `IOEC2025.POAP_${i}.json`,
        _index: i,
        tokenURI: `ipfs://${folderHash}/IOEC2025.POAP_${i}.json`,
      });
    } catch (e) {
      // skip missing or invalid files
    }
  }
  return files;
}

export default function BatchLectureImport() {
  const [folderHash, setFolderHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [lectures, setLectures] = useState([]);
  const [error, setError] = useState('');
  const [editIndex, setEditIndex] = useState(null);
  const [editLecture, setEditLecture] = useState(null);
  const [success, setSuccess] = useState('');
  const [progress, setProgress] = useState(0); // 0-1
  const [statuses, setStatuses] = useState([]); // [{status: 'pending'|'success'|'error', message: string}]

  // Step 1: Fetch all metadata files from IPFS folder
  const handleFetch = async () => {
    setLoading(true);
    setError('');
    setLectures([]);
    setSuccess('');
    try {
      const files = await fetchIpfsMetadataFolder(folderHash);
      if (!files.length) throw new Error('No valid metadata files found in this folder.');
      setLectures(files);
    } catch (e) {
      setError(e.message || 'Failed to fetch metadata files.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Edit lecture
  const handleEdit = (idx) => {
    setEditIndex(idx);
    setEditLecture({ ...lectures[idx] });
  };
  const handleEditChange = (field, value) => {
    setEditLecture((prev) => ({ ...prev, [field]: value }));
  };
  const handleEditAttrChange = (attrIdx, field, value) => {
    setEditLecture((prev) => {
      const attrs = [...prev.attributes];
      attrs[attrIdx] = { ...attrs[attrIdx], [field]: value };
      return { ...prev, attributes: attrs };
    });
  };
  const handleEditSave = () => {
    setLectures((prev) => prev.map((l, i) => (i === editIndex ? editLecture : l)));
    setEditIndex(null);
    setEditLecture(null);
  };

  // Step 3: Create lectures (sequentially, with progress/status)
  const handleCreateLectures = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setProgress(0);
    setStatuses(Array(lectures.length).fill({ status: 'pending', message: '' }));
    let newStatuses = Array(lectures.length).fill({ status: 'pending', message: '' });
    for (let i = 0; i < lectures.length; i++) {
      setProgress((i) / lectures.length);
      setStatuses((prev) => {
        const arr = [...prev];
        arr[i] = { status: 'pending', message: 'Creating...' };
        return arr;
      });
      try {
        const res = await fetch('/api/admin/batch-create-lectures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lectures: [lectures[i]] }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed');
        }
        setStatuses((prev) => {
          const arr = [...prev];
          arr[i] = { status: 'success', message: 'Created' };
          return arr;
        });
      } catch (e) {
        setStatuses((prev) => {
          const arr = [...prev];
          arr[i] = { status: 'error', message: e.message || 'Error' };
          return arr;
        });
      }
    }
    setProgress(1);
    setLoading(false);
    setSuccess('Batch creation finished.');
  };

  return (
    <Layout title="Batch Add Lectures (Admin)">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        <h1 style={{ color: '#00838f', fontWeight: 700, fontSize: '2rem', marginBottom: 24 }}>Batch Add Lectures from IPFS</h1>
        <div style={{ marginBottom: 24 }}>
          <label htmlFor="ipfs-folder" style={{ fontWeight: 600 }}>IPFS Folder Hash:</label>
          <input
            id="ipfs-folder"
            type="text"
            value={folderHash}
            onChange={e => setFolderHash(e.target.value)}
            placeholder="e.g. bafybeicbh5k5rp2t4enld3wqcrai2uowihlru2r4x73lny3zvj2uzppzku"
            style={{ marginLeft: 12, padding: 8, width: 380, borderRadius: 6, border: '1px solid #ccc' }}
            disabled={loading}
          />
          <button onClick={handleFetch} disabled={!folderHash || loading} style={{ marginLeft: 16, padding: '8px 18px', background: '#00838f', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>Fetch</button>
        </div>
        {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
        {success && <div style={{ color: 'green', marginBottom: 16 }}>{success}</div>}
        {loading && <div>Loading...</div>}
        {lectures.length > 0 && (
          <>
            <h2 style={{ fontSize: '1.2rem', margin: '18px 0 10px 0' }}>Lectures to be created ({lectures.length}):</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
              <thead>
                <tr style={{ background: '#e0f7fa' }}>
                  <th style={{ padding: 8 }}>#</th>
                  <th style={{ padding: 8 }}>Name</th>
                  <th style={{ padding: 8 }}>Venue</th>
                  <th style={{ padding: 8 }}>Room</th>
                  <th style={{ padding: 8 }}>Date</th>
                  <th style={{ padding: 8 }}>Time</th>
                  <th style={{ padding: 8 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lectures.map((l, i) => (
                  <tr key={l._filename || l.name || i} style={{ background: i % 2 ? '#f9f9f9' : '#fff' }}>
                    <td style={{ padding: 8 }}>{i}</td>
                    <td style={{ padding: 8 }}>{l.name}</td>
                    <td style={{ padding: 8 }}>{l.attributes?.find(a => a.trait_type === 'venue')?.value || ''}</td>
                    <td style={{ padding: 8 }}>{l.attributes?.find(a => a.trait_type === 'room')?.value || ''}</td>
                    <td style={{ padding: 8 }}>{l.attributes?.find(a => a.trait_type === 'date_start_plan')?.value || ''}</td>
                    <td style={{ padding: 8 }}>{l.attributes?.find(a => a.trait_type === 'time_start_plan')?.value || ''}</td>
                    <td style={{ padding: 8 }}>
                      <button onClick={() => handleEdit(i)} style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid #00838f', background: '#e0f7fa', color: '#00838f', fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={handleCreateLectures} style={{ padding: '10px 28px', background: '#00838f', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer' }} disabled={loading}>Create Lectures</button>
            {/* Progress bar and per-lecture status */}
            {(loading || statuses.length > 0) && (
              <div style={{ marginTop: 24 }}>
                <div style={{ height: 18, background: '#eee', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ width: `${Math.round(progress * 100)}%`, background: '#00838f', height: '100%', transition: 'width 0.3s' }} />
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                  <thead>
                    <tr style={{ background: '#f0f0f0' }}>
                      <th style={{ padding: 6 }}>#</th>
                      <th style={{ padding: 6 }}>Name</th>
                      <th style={{ padding: 6 }}>Status</th>
                      <th style={{ padding: 6 }}>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lectures.map((l, i) => (
                      <tr key={l._filename || l.name || i} style={{ background: i % 2 ? '#fafafa' : '#fff' }}>
                        <td style={{ padding: 6 }}>{i}</td>
                        <td style={{ padding: 6 }}>{l.name}</td>
                        <td style={{ padding: 6 }}>
                          {statuses[i]?.status === 'success' && <span style={{ color: 'green' }}>Success</span>}
                          {statuses[i]?.status === 'error' && <span style={{ color: 'red' }}>Error</span>}
                          {statuses[i]?.status === 'pending' && <span style={{ color: '#888' }}>Pending</span>}
                        </td>
                        <td style={{ padding: 6 }}>{statuses[i]?.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        {/* Edit modal */}
        {editLecture && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 10, padding: 28, minWidth: 340, maxWidth: 520 }}>
              <h3>Edit Lecture #{editIndex}</h3>
              <div style={{ marginBottom: 10 }}>
                <label htmlFor="edit-name">Name: </label>
                <input id="edit-name" value={editLecture.name} onChange={e => handleEditChange('name', e.target.value)} style={{ width: '90%' }} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label htmlFor="edit-description">Description: </label>
                <textarea id="edit-description" value={editLecture.description} onChange={e => handleEditChange('description', e.target.value)} style={{ width: '90%' }} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label htmlFor="edit-image">Image: </label>
                <input id="edit-image" value={editLecture.image} onChange={e => handleEditChange('image', e.target.value)} style={{ width: '90%' }} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <span>Attributes:</span>
                {editLecture.attributes?.map((attr, idx) => (
                  <div key={`${attr.trait_type || 'attr'}-${attr.value || ''}-${idx}`} style={{ marginLeft: 10, marginBottom: 4 }}>
                    <input aria-label="Trait type" value={attr.trait_type} onChange={e => handleEditAttrChange(idx, 'trait_type', e.target.value)} style={{ width: 120, marginRight: 8 }} />
                    <input aria-label="Trait value" value={attr.value} onChange={e => handleEditAttrChange(idx, 'value', e.target.value)} style={{ width: 180 }} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 18, display: 'flex', gap: 16 }}>
                <button type="button" onClick={handleEditSave} style={{ padding: '7px 18px', background: '#00838f', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600 }}>Save</button>
                <button type="button" onClick={() => { setEditIndex(null); setEditLecture(null); }} style={{ padding: '7px 18px', background: '#eee', color: '#333', border: 'none', borderRadius: 6, fontWeight: 600 }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
