'use client'

import { useState, useEffect, useMemo } from 'react'

// Types
type Hotel = { id: string; name: string; address: string | null; floors: Floor[] }
type Floor = { id: string; number: string; rooms: Room[] }
type Room = { id: string; number: string; positions: Position[] }
type Position = { id: string; name: string; artworkId?: string | null; artwork: Artwork | null }
type Artwork = {
  id: string; title: string; author: string; authorAge: number | null;
  description: string | null; image: string | null;
  position: (Position & { room: Room & { floor: Floor & { hotel: Hotel } } }) | null;
  status: string; createdAt: string; updatedAt: string
}
type Stats = { hotelCount: number; artworkCount: number; positionCount: number; emptyPositionCount: number; statusCounts: Record<string, number> }

const STATUS_MAP: Record<string, { text: string; color: string; bg: string }> = {
  pending: { text: '待分配', color: '#92400e', bg: '#fef3c7' },
  assigned: { text: '已分配', color: '#1e40af', bg: '#dbeafe' },
  framed: { text: '已装裱', color: '#065f46', bg: '#d1fae5' },
  hung: { text: '已悬挂', color: '#3730a3', bg: '#e0e7ff' }
}

export default function Home() {
  const [view, setView] = useState('dashboard')
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  // Forms
  const [newHotelName, setNewHotelName] = useState('')
  const [newFloorNum, setNewFloorNum] = useState<Record<string, string>>({})
  const [newRoomNum, setNewRoomNum] = useState<Record<string, string>>({})
  const [newPosName, setNewPosName] = useState<Record<string, string>>({})
  const [artForm, setArtForm] = useState({ title: '', author: '', authorAge: '', description: '', image: '' })

  // Modals
  const [showAssign, setShowAssign] = useState(false)
  const [assignArtwork, setAssignArtwork] = useState<Artwork | null>(null)
  const [assignForm, setAssignForm] = useState({ hotelId: '', floorId: '', roomId: '', positionId: '' })
  const [showDetail, setShowDetail] = useState(false)
  const [detailArt, setDetailArt] = useState<Artwork | null>(null)
  const [search, setSearch] = useState('')
  const [artworkFilter, setArtworkFilter] = useState<'all' | 'assigned' | 'pending'>('all')

  // Fetch
  const fetchData = async () => {
    setLoading(true)
    try {
      const [h, a, s] = await Promise.all([
        fetch('/api/hotels').then(r => r.json()),
        fetch('/api/artworks').then(r => r.json()),
        fetch('/api/stats').then(r => r.json())
      ])
      setHotels(h); setArtworks(a); setStats(s)
    } catch (e) { console.error(e) }
    setLoading(false)
  }
  useEffect(() => { fetchData() }, [])

  const api = async (m: string, u: string, b?: any) => {
    const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined })
    if (!r.ok) throw new Error(`API ${r.status}`)
    return r.json()
  }

  // CRUD
  const addHotel = async () => { if (!newHotelName.trim()) return; await api('POST', '/api/hotels', { name: newHotelName }); setNewHotelName(''); fetchData() }
  const deleteHotel = async (id: string) => { if (!confirm('确定删除该酒店及其所有数据？')) return; await api('DELETE', `/api/hotels?id=${id}`); fetchData() }
  const addFloor = async (hid: string) => { const n = newFloorNum[hid]; if (!n?.trim()) return; await api('POST', '/api/floors', { hotelId: hid, number: n }); setNewFloorNum(p => ({ ...p, [hid]: '' })); fetchData() }
  const deleteFloor = async (id: string) => { await api('DELETE', `/api/floors?id=${id}`); fetchData() }
  const addRoom = async (fid: string) => { const n = newRoomNum[fid]; if (!n?.trim()) return; await api('POST', '/api/rooms', { floorId: fid, number: n }); setNewRoomNum(p => ({ ...p, [fid]: '' })); fetchData() }
  const deleteRoom = async (id: string) => { await api('DELETE', `/api/rooms?id=${id}`); fetchData() }
  const addPosition = async (rid: string) => { const n = newPosName[rid]; if (!n?.trim()) return; await api('POST', '/api/positions', { roomId: rid, name: n }); setNewPosName(p => ({ ...p, [rid]: '' })); fetchData() }
  const deletePosition = async (id: string) => { await api('DELETE', `/api/positions?id=${id}`); fetchData() }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader(); r.onload = (ev) => setArtForm(p => ({ ...p, image: ev.target?.result as string })); r.readAsDataURL(f)
  }
  const addArtwork = async () => {
    if (!artForm.title || !artForm.author) return alert('请填写作品名称和作者')
    await api('POST', '/api/artworks', { ...artForm, authorAge: artForm.authorAge ? parseInt(artForm.authorAge) : null })
    setArtForm({ title: '', author: '', authorAge: '', description: '', image: '' }); fetchData()
  }
  const deleteArtwork = async (id: string) => { await api('DELETE', `/api/artworks?id=${id}`); fetchData() }

  const openAssign = (a: Artwork) => { setAssignArtwork(a); setAssignForm({ hotelId: '', floorId: '', roomId: '', positionId: a.position?.id || '' }); setShowAssign(true) }

  const doAssign = async () => {
    if (!assignForm.positionId) return alert('请选择位置')
    if (!assignArtwork) return
    // 检查占用
    const room = hotels.find(h => h.id === assignForm.hotelId)?.floors?.find(f => f.id === assignForm.floorId)?.rooms?.find(r => r.id === assignForm.roomId)
    const pos = room?.positions?.find(p => p.id === assignForm.positionId)
    if (pos?.artworkId && pos.artworkId !== assignArtwork.id) {
      const occ = artworks.find(a => a.id === pos.artworkId)
      if (!confirm(`该位置「${pos.name}」已有画作「${occ?.title}」\n\n确定要替换吗？原画作将更新为未分配。`)) return
      await api('PUT', '/api/artworks', { id: pos.artworkId, positionId: null, status: 'pending' })
    }
    await api('PUT', '/api/artworks', { id: assignArtwork.id, positionId: assignForm.positionId, status: 'assigned' })
    setShowAssign(false); fetchData()
  }

  const updateArtwork = async (d: { id: string; status: string }) => { await api('PUT', '/api/artworks', d); fetchData() }

  const getLoc = (a: Artwork) => a.position ? `${a.position.room.floor.hotel.name} · ${a.position.room.floor.number} · ${a.position.room.number} · ${a.position.name}` : '未分配'

  const filtered = useMemo(() => {
    if (!search.trim()) return artworks
    const q = search.toLowerCase()
    return artworks.filter(a => a.title?.toLowerCase().includes(q) || a.author?.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q) || String(a.authorAge || '').includes(q))
  }, [artworks, search])

  const highlight = (t: string) => {
    if (!t || !search.trim()) return t
    const re = new RegExp(`(${search.trim()})`, 'gi'); const parts = t.split(re)
    return parts.map((p, i) => re.test(p) ? <mark key={i} style={{ background: '#fef08a', padding: '0 2px', borderRadius: 2 }}>{p}</mark> : p)
  }

  const clearAll = async () => {
    if (!confirm('确定要清空所有数据吗？此操作不可撤销！')) return
    for (const a of artworks) await api('DELETE', `/api/artworks?id=${a.id}`)
    for (const h of hotels) await api('DELETE', `/api/hotels?id=${h.id}`)
    fetchData()
  }

  if (loading) return <div className="loading-screen"><div className="spinner"></div><p>加载中...</p></div>

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">🎨</div>
          <div className="brand-text"><h1>挂画管理系统</h1><span>Artwork Management</span></div>
        </div>
        <nav className="sidebar-nav">
          {[
            { id: 'dashboard', icon: '📊', label: '全局看板' },
            { id: 'admin', icon: '📍', label: '空间管理' },
            { id: 'artwork', icon: '🖼️', label: '画作管理' },
            { id: 'supplier', icon: '🔨', label: '供应商工作台' }
          ].map(item => (
            <button key={item.id} className={`nav-btn ${view === item.id ? 'active' : ''}`} onClick={() => setView(item.id)}>
              <span className="nav-icon">{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn-clear" onClick={clearAll}>🗑️ 清空数据</button>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        {/* Dashboard */}
        {view === 'dashboard' && (
          <>
            <div className="page-header">
              <h2>全局看板</h2>
              <span className="subtitle">实时掌握画作分布与状态</span>
            </div>
            <div className="stats-grid">
              {[
                { num: stats?.hotelCount || 0, label: '酒店', icon: '🏨', color: '#3b82f6' },
                { num: stats?.artworkCount || 0, label: '画作', icon: '🖼️', color: '#8b5cf6' },
                { num: stats?.positionCount || 0, label: '总位置', icon: '📌', color: '#f59e0b' },
                { num: stats?.emptyPositionCount || 0, label: '空余位置', icon: '✅', color: '#10b981' }
              ].map((s, i) => (
                <div key={i} className="stat-card" style={{ borderTopColor: s.color }}>
                  <div className="stat-icon" style={{ background: s.color + '20', color: s.color }}>{s.icon}</div>
                  <div className="stat-num" style={{ color: s.color }}>{s.num}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-header"><h3>画作分布总览</h3></div>
              <div className="search-bar">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 搜索展签内容..." className="search-input" />
                {search && <button className="btn-text" onClick={() => setSearch('')}>清除</button>}
              </div>
              <div className="artwork-grid">
                {filtered.map(a => (
                  <div key={a.id} className="artwork-card" onClick={() => { setDetailArt(a); setShowDetail(true) }}>
                    <div className="artwork-img">
                      {a.image ? <img src={a.image} alt={a.title} /> : <div className="img-placeholder">🖼️</div>}
                      <span className="status-badge" style={{ background: STATUS_MAP[a.status]?.bg || '#eee', color: STATUS_MAP[a.status]?.color || '#333' }}>{STATUS_MAP[a.status]?.text}</span>
                    </div>
                    <div className="artwork-info">
                      <h4>{highlight(a.title)}</h4>
                      <p className="location">{getLoc(a)}</p>
                      <p className="author">{highlight(a.author)} · {a.authorAge}岁</p>
                    </div>
                  </div>
                ))}
              </div>
              {filtered.length === 0 && <div className="empty">{search ? `未找到 "${search}"` : '暂无画作'}</div>}
            </div>
          </>
        )}

        {/* Admin */}
        {view === 'admin' && (
          <>
            <div className="page-header"><h2>空间管理</h2><span className="subtitle">配置酒店、楼层、房间与挂画位置</span></div>
            <div className="card">
              <div className="inline-form">
                <input value={newHotelName} onChange={e => setNewHotelName(e.target.value)} placeholder="输入酒店名称" className="form-input flex-1" onKeyDown={e => e.key === 'Enter' && addHotel()} />
                <button onClick={addHotel} className="btn btn-primary">+ 添加酒店</button>
              </div>
            </div>
            {hotels.map(hotel => (
              <div key={hotel.id} className="card hotel-card">
                <div className="hotel-header">
                  <div><span className="hotel-icon">🏨</span><h3>{hotel.name}</h3></div>
                  <button onClick={() => deleteHotel(hotel.id)} className="btn btn-ghost btn-sm">删除</button>
                </div>
                <div className="tree">
                  <div className="inline-form">
                    <input value={newFloorNum[hotel.id] || ''} onChange={e => setNewFloorNum(p => ({ ...p, [hotel.id]: e.target.value }))} placeholder="楼层号" className="form-input flex-1" onKeyDown={e => e.key === 'Enter' && addFloor(hotel.id)} />
                    <button onClick={() => addFloor(hotel.id)} className="btn btn-ghost btn-sm">+ 楼层</button>
                  </div>
                  {hotel.floors?.map(floor => (
                    <div key={floor.id} className="tree-node">
                      <div className="tree-label"><span className="tree-icon">📐</span>{floor.number}<button onClick={() => deleteFloor(floor.id)} className="btn btn-ghost btn-xs">×</button></div>
                      <div className="tree-children">
                        <div className="inline-form">
                          <input value={newRoomNum[floor.id] || ''} onChange={e => setNewRoomNum(p => ({ ...p, [floor.id]: e.target.value }))} placeholder="房间号" className="form-input flex-1" onKeyDown={e => e.key === 'Enter' && addRoom(floor.id)} />
                          <button onClick={() => addRoom(floor.id)} className="btn btn-ghost btn-sm">+ 房间</button>
                        </div>
                        {floor.rooms?.map(room => (
                          <div key={room.id} className="tree-node">
                            <div className="tree-label"><span className="tree-icon">🚪</span>房间 {room.number}<button onClick={() => deleteRoom(room.id)} className="btn btn-ghost btn-xs">×</button></div>
                            <div className="tree-children">
                              <div className="inline-form">
                                <input value={newPosName[room.id] || ''} onChange={e => setNewPosName(p => ({ ...p, [room.id]: e.target.value }))} placeholder="位置名称" className="form-input flex-1" onKeyDown={e => e.key === 'Enter' && addPosition(room.id)} />
                                <button onClick={() => addPosition(room.id)} className="btn btn-ghost btn-sm">+ 位置</button>
                              </div>
                              {room.positions?.map(pos => (
                                <div key={pos.id} className="pos-item">
                                  <span className="pos-name"><span className="pos-icon">📌</span>{pos.name}</span>
                                  <span className={`pos-status ${pos.artworkId ? 'occupied' : 'empty'}`}>{pos.artworkId ? '已占用' : '空位'}</span>
                                  <button onClick={() => deletePosition(pos.id)} className="btn btn-ghost btn-xs">×</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Artwork */}
        {view === 'artwork' && (
          <>
            <div className="page-header"><h2>画作管理</h2><span className="subtitle">上传画作、填写展签、分配位置</span></div>
            <div className="card">
              <h3 className="section-title">📝 上传新画作</h3>
              <div className="artwork-form">
                <div className="form-row">
                  <div className="form-field"><label>作品名称</label><input value={artForm.title} onChange={e => setArtForm(p => ({ ...p, title: e.target.value }))} placeholder="输入作品名称" className="form-input" /></div>
                  <div className="form-field"><label>作者名称</label><input value={artForm.author} onChange={e => setArtForm(p => ({ ...p, author: e.target.value }))} placeholder="输入作者名称" className="form-input" /></div>
                </div>
                <div className="form-row">
                  <div className="form-field"><label>作者年龄</label><input type="number" value={artForm.authorAge} onChange={e => setArtForm(p => ({ ...p, authorAge: e.target.value }))} placeholder="输入年龄" className="form-input" /></div>
                  <div className="form-field"><label>预览图片</label><input type="file" accept="image/*" onChange={handleImageUpload} className="form-input file-input" /></div>
                </div>
                <div className="form-field full"><label>作品阐释</label><textarea value={artForm.description} onChange={e => setArtForm(p => ({ ...p, description: e.target.value }))} placeholder="输入创作理念、背景故事..." className="form-input textarea" /></div>
                <div style={{ textAlign: 'center' }}><button onClick={addArtwork} className="btn btn-primary">保存画作</button></div>
              </div>
            </div>
            <div className="card">
              <div className="card-header">
                <h3>📋 画作列表</h3>
                <div className="filter-tabs">
                  <button className={`filter-tab ${artworkFilter === 'all' ? 'active' : ''}`} onClick={() => setArtworkFilter('all')}>全部</button>
                  <button className={`filter-tab ${artworkFilter === 'pending' ? 'active' : ''}`} onClick={() => setArtworkFilter('pending')}>未分配</button>
                  <button className={`filter-tab ${artworkFilter === 'assigned' ? 'active' : ''}`} onClick={() => setArtworkFilter('assigned')}>已分配</button>
                </div>
              </div>
              <table className="data-table">
                <thead><tr><th>预览</th><th>作品</th><th>作者</th><th>状态</th><th>位置</th><th>操作</th></tr></thead>
                <tbody>
                  {artworks.filter(a => artworkFilter === 'all' || (artworkFilter === 'pending' ? !a.position : !!a.position)).map(a => (
                    <tr key={a.id}>
                      <td>{a.image ? <img src={a.image} className="thumb" /> : <div className="thumb-placeholder">🖼️</div>}</td>
                      <td className="fw-600">{a.title}</td>
                      <td>{a.author} ({a.authorAge}岁)</td>
                      <td><span className="status-dot" style={{ background: STATUS_MAP[a.status]?.bg, color: STATUS_MAP[a.status]?.color }}>{STATUS_MAP[a.status]?.text}</span></td>
                      <td className="text-muted">{getLoc(a)}</td>
                      <td className="actions">
                        <button onClick={() => openAssign(a)} className="btn btn-primary btn-sm">{a.position ? '改位置' : '分配'}</button>
                        <button onClick={() => deleteArtwork(a.id)} className="btn btn-ghost btn-sm btn-danger">删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {artworks.length === 0 && <div className="empty">暂无画作，点击上方表单添加</div>}
            </div>
          </>
        )}

        {/* Supplier */}
        {view === 'supplier' && (
          <>
            <div className="page-header"><h2>供应商工作台</h2><span className="subtitle">待制作清单与进度跟踪</span></div>
            <div className="card">
              <table className="data-table">
                <thead><tr><th>画作</th><th>展签信息</th><th>具体位置</th><th>状态</th><th>操作</th></tr></thead>
                <tbody>
                  {artworks.filter(a => a.position && a.status !== 'hung').map(a => (
                    <tr key={a.id}>
                      <td>
                        {a.image ? <img src={a.image} className="thumb-lg" /> : <div className="thumb-placeholder-lg">🖼️</div>}
                        <div className="fw-600" style={{ marginTop: 6 }}>{a.title}</div>
                      </td>
                      <td className="text-sm">
                        <div><strong>作品：</strong>{a.title}</div>
                        <div><strong>作者：</strong>{a.author}（{a.authorAge}岁）</div>
                        <div><strong>阐释：</strong>{a.description}</div>
                      </td>
                      <td className="text-muted text-sm">{getLoc(a)}</td>
                      <td><span className="status-dot" style={{ background: STATUS_MAP[a.status]?.bg, color: STATUS_MAP[a.status]?.color }}>{STATUS_MAP[a.status]?.text}</span></td>
                      <td>
                        {a.status === 'assigned' && <button onClick={() => updateArtwork({ id: a.id, status: 'framed' })} className="btn btn-success btn-sm">标记已装裱</button>}
                        {a.status === 'framed' && <button onClick={() => updateArtwork({ id: a.id, status: 'hung' })} className="btn btn-primary btn-sm">标记已悬挂</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {artworks.filter(a => a.position && a.status !== 'hung').length === 0 && <div className="empty">暂无待制作画作</div>}
            </div>
          </>
        )}
      </main>

      {/* Assign Modal */}
      {showAssign && (
        <Modal onClose={() => setShowAssign(false)} title={`分配位置 — ${assignArtwork?.title}`}>
          <div className="modal-form">
            <FormField label="选择酒店">
              <select value={assignForm.hotelId} onChange={e => setAssignForm({ hotelId: e.target.value, floorId: '', roomId: '', positionId: '' })} className="form-input">
                <option value="">请选择</option>{hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </FormField>
            {assignForm.hotelId && <FormField label="选择楼层">
              <select value={assignForm.floorId} onChange={e => setAssignForm(p => ({ ...p, floorId: e.target.value, roomId: '', positionId: '' }))} className="form-input">
                <option value="">请选择</option>{hotels.find(h => h.id === assignForm.hotelId)?.floors?.map(f => <option key={f.id} value={f.id}>{f.number}</option>)}
              </select>
            </FormField>}
            {assignForm.floorId && <FormField label="选择房间">
              <select value={assignForm.roomId} onChange={e => setAssignForm(p => ({ ...p, roomId: e.target.value, positionId: '' }))} className="form-input">
                <option value="">请选择</option>{hotels.find(h => h.id === assignForm.hotelId)?.floors?.find(f => f.id === assignForm.floorId)?.rooms?.map(r => <option key={r.id} value={r.id}>{r.number}</option>)}
              </select>
            </FormField>}
            {assignForm.roomId && <FormField label="选择位置">
              <select value={assignForm.positionId} onChange={e => setAssignForm(p => ({ ...p, positionId: e.target.value }))} className="form-input">
                <option value="">请选择</option>
                {hotels.find(h => h.id === assignForm.hotelId)?.floors?.find(f => f.id === assignForm.floorId)?.rooms?.find(r => r.id === assignForm.roomId)?.positions?.map(p => {
                  const occ = p.artworkId && p.artworkId !== assignArtwork?.id
                  const occArt = occ ? artworks.find(a => a.id === p.artworkId) : null
                  return <option key={p.id} value={p.id}>{p.name} {occ ? `（已分配 - ${occArt?.title}）` : '（空位）'}</option>
                })}
              </select>
            </FormField>}
          </div>
          <div className="modal-actions">
            <button onClick={() => setShowAssign(false)} className="btn btn-ghost">取消</button>
            <button onClick={doAssign} className="btn btn-primary">确认分配</button>
          </div>
        </Modal>
      )}

      {/* Detail Modal */}
      {showDetail && detailArt && (
        <Modal onClose={() => setShowDetail(false)} title={detailArt.title}>
          {detailArt.image && <div className="detail-img"><img src={detailArt.image} /></div>}
          <div className="detail-grid">
            <div className="detail-item"><span className="label">作者</span><span>{detailArt.author}</span></div>
            <div className="detail-item"><span className="label">年龄</span><span>{detailArt.authorAge} 岁</span></div>
            <div className="detail-item"><span className="label">位置</span><span className="highlight">{getLoc(detailArt)}</span></div>
            <div className="detail-item"><span className="label">状态</span><span className="status-dot" style={{ background: STATUS_MAP[detailArt.status]?.bg, color: STATUS_MAP[detailArt.status]?.color }}>{STATUS_MAP[detailArt.status]?.text}</span></div>
          </div>
          <div className="detail-item full"><span className="label">作品阐释</span><p>{detailArt.description || '暂无'}</p></div>
        </Modal>
      )}

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif; background: #f1f5f9; color: #1e293b; }
        
        /* Layout */
        .app { display: flex; min-height: 100vh; }
        .sidebar { width: 260px; background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%); color: white; display: flex; flex-direction: column; position: fixed; height: 100vh; z-index: 10; }
        .sidebar-brand { padding: 24px 20px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .brand-icon { font-size: 28px; }
        .brand-text h1 { font-size: 16px; font-weight: 700; letter-spacing: -0.01em; }
        .brand-text span { font-size: 11px; color: #94a3b8; letter-spacing: 0.02em; }
        .sidebar-nav { padding: 16px 12px; flex: 1; }
        .nav-btn { width: 100%; display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: none; background: transparent; color: #cbd5e1; border-radius: 8px; cursor: pointer; font-size: 14px; transition: all 0.15s; margin-bottom: 2px; text-align: left; }
        .nav-btn:hover { background: rgba(255,255,255,0.06); color: white; }
        .nav-btn.active { background: #3b82f6; color: white; }
        .nav-icon { font-size: 18px; width: 24px; text-align: center; }
        .sidebar-footer { padding: 16px 12px; border-top: 1px solid rgba(255,255,255,0.08); }
        .main { margin-left: 260px; flex: 1; padding: 32px 40px; min-height: 100vh; }
        
        /* Page Header */
        .page-header { margin-bottom: 28px; }
        .page-header h2 { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; color: #0f172a; }
        .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; display: block; }
        
        /* Stats */
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .stat-card { background: white; border-radius: 12px; padding: 20px; text-align: center; border-top: 3px solid; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
        .stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; margin: 0 auto 10px; }
        .stat-num { font-size: 28px; font-weight: 800; letter-spacing: -0.03em; }
        .stat-label { font-size: 13px; color: #64748b; margin-top: 4px; }
        
        /* Cards */
        .card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .card-header h3 { font-size: 16px; font-weight: 600; }
        .section-title { font-size: 15px; font-weight: 600; margin-bottom: 16px; color: #334155; }
        
        /* Forms */
        .form-input { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; width: 100%; transition: border-color 0.15s; background: white; }
        .form-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .textarea { min-height: 80px; resize: vertical; }
        .file-input { padding: 6px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-field { display: flex; flex-direction: column; gap: 6px; }
        .form-field label { font-size: 13px; font-weight: 500; color: #475569; }
        .form-field.full { grid-column: 1 / -1; }
        .artwork-form { display: flex; flex-direction: column; gap: 16px; }
        .inline-form { display: flex; gap: 8px; align-items: center; }
        .flex-1 { flex: 1; }
        
        /* Buttons */
        .btn { padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.15s; display: inline-flex; align-items: center; gap: 6px; }
        .btn-primary { background: #3b82f6; color: white; } .btn-primary:hover { background: #2563eb; }
        .btn-success { background: #10b981; color: white; } .btn-success:hover { background: '#059669'; }
        .btn-ghost { background: transparent; color: #64748b; border: 1px solid #e2e8f0; } .btn-ghost:hover { background: #f8fafc; }
        .btn-sm { padding: 5px 10px; font-size: 12px; border-radius: 6px; }
        .btn-xs { padding: 2px 6px; font-size: 14px; border-radius: 4px; border: none; background: transparent; cursor: pointer; color: #94a3b8; } .btn-xs:hover { color: #ef4444; }
        .btn-text { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 13px; }
        .btn-clear { width: 100%; padding: 8px; border: 1px solid rgba(239,68,68,0.3); background: rgba(239,68,68,0.1); color: #fca5a5; border-radius: 8px; cursor: pointer; font-size: 13px; } .btn-clear:hover { background: rgba(239,68,68,0.2); }
        .btn-danger { color: #ef4444; }
        
        /* Table */
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th { padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 2px solid #f1f5f9; }
        .data-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; vertical-align: middle; }
        .data-table tr:hover td { background: #f8fafc; }
        .thumb { width: 48px; height: 48px; object-fit: cover; border-radius: 8px; }
        .thumb-lg { width: 80px; height: 60px; object-fit: cover; border-radius: 8px; }
        .thumb-placeholder { width: 48px; height: 48px; background: #f1f5f9; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        .thumb-placeholder-lg { width: 80px; height: 60px; background: #f1f5f9; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
        .text-sm { font-size: 13px; line-height: 1.6; }
        .actions { display: flex; gap: 6px; }
        .fw-600 { font-weight: 600; }
        .text-muted { color: #94a3b8; font-size: 13px; }
        
        /* Status */
        .status-dot { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
        .status-badge { position: absolute; top: 8px; right: 8px; padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 500; }
        
        /* Artwork Grid */
        .artwork-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
        .artwork-card { background: white; border-radius: 12px; overflow: hidden; cursor: pointer; border: 1px solid #e2e8f0; transition: all 0.2s; }
        .artwork-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.08); border-color: #3b82f6; }
        .artwork-img { position: relative; height: 160px; overflow: hidden; background: #f8fafc; }
        .artwork-img img { width: 100%; height: 100%; object-fit: cover; }
        .img-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 40px; color: #cbd5e1; }
        .artwork-info { padding: 14px; }
        .artwork-info h4 { font-size: 14px; font-weight: 600; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .location { font-size: 12px; color: #64748b; margin-bottom: 4px; }
        .author { font-size: 12px; color: #94a3b8; }
        
        /* Tree */
        .hotel-card { border-left: 3px solid #3b82f6; }
        .hotel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .hotel-header > div { display: flex; align-items: center; gap: 8px; }
        .hotel-icon { font-size: 20px; }
        .hotel-header h3 { font-size: 16px; font-weight: 600; }
        .tree { padding-left: 12px; }
        .tree-node { margin: 8px 0; }
        .tree-label { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 500; padding: 6px 0; color: #334155; }
        .tree-icon { font-size: 16px; }
        .tree-children { padding-left: 16px; margin-left: 8px; border-left: 2px solid #e2e8f0; }
        .pos-item { display: flex; align-items: center; gap: 8px; padding: 4px 8px; margin: 3px 0; background: #f8fafc; border-radius: 6px; height: 32px; min-height: 32px; max-height: 32px; overflow: hidden; }
        .pos-name { font-size: 13px; flex: 1; display: flex; align-items: center; gap: 4px; }
        .pos-icon { font-size: 14px; }
        .pos-status { font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 500; }
        .pos-status.empty { background: #d1fae5; color: #065f46; }
        .pos-status.occupied { background: #fef3c7; color: '#92400e'; }
        
        /* Search */
        .search-bar { display: flex; gap: 8px; margin-bottom: 20px; }
        .search-input { padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; width: 100%; max-width: 400px; }
        .search-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        
        /* Filter Tabs */
        .filter-tabs { display: flex; gap: 4px; }
        .filter-tab { padding: 4px 12px; border: 1px solid #e2e8f0; background: transparent; border-radius: 6px; font-size: 12px; cursor: pointer; color: #64748b; transition: all 0.15s; }
        .filter-tab:hover { background: #f1f5f9; }
        .filter-tab.active { background: #3b82f6; color: white; border-color: #3b82f6; }
        
        /* Task List (Supplier) */
        .task-list { display: flex; flex-direction: column; gap: 16px; }
        .task-card { display: flex; gap: 16px; padding: 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
        .task-artwork { flex-shrink: 0; }
        .task-artwork img { width: 80px; height: 80px; object-fit: cover; border-radius: 10px; }
        .img-ph { width: 80px; height: 80px; background: #e2e8f0; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 32px; color: #94a3b8; }
        .task-title { font-weight: 600; font-size: 14px; margin-top: 8px; text-align: center; }
        .task-details { flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
        .task-info { display: flex; flex-direction: column; gap: 6px; }
        .info-row { font-size: 13px; display: flex; gap: 8px; }
        .info-row .label { color: #64748b; min-width: 50px; }
        .info-row .highlight { color: #3b82f6; font-weight: 500; }
        .task-actions { display: flex; gap: 10px; align-items: center; margin-top: 10px; }
        
        /* Modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: white; border-radius: 16px; padding: 28px; max-width: 560px; width: 92%; max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
        .modal-title { font-size: 18px; font-weight: 700; margin-bottom: 20px; color: #0f172a; }
        .modal-form { display: flex; flex-direction: column; gap: 14px; }
        .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 24px; }
        .detail-img { margin-bottom: 20px; border-radius: 12px; overflow: hidden; }
        .detail-img img { width: 100%; border-radius: 12px; }
        .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .detail-item { display: flex; flex-direction: column; gap: 4px; }
        .detail-item.full { grid-column: 1 / -1; }
        .detail-item .label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em; }
        .detail-item p { font-size: 14px; line-height: 1.6; color: #334155; }
        
        /* Misc */
        .empty { text-align: center; font-size: 11px; }
        .loading-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f1f5f9; }
        .spinner { width: 36px; height: 36px; border: 3px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        /* Scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: '#94a3b8'; }
        select { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; width: 100%; background: white; }
        select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        tr:hover td { background: #f8fafc; }
      `}</style>
    </div>
  )
}

// Components
function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        {children}
      </div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="form-field"><label>{label}</label>{children}</div>
}
