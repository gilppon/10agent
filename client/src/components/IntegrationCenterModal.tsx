import React, { useState, useEffect } from "react";
import { X, Eye, EyeOff, Save, Zap, BookOpen, CheckCircle2, AlertCircle, Clock, ExternalLink } from "lucide-react";

interface IntegrationField {
  key: string;
  label: string;
  type: "text" | "password" | "select";
  placeholder?: string;
  options?: string[];
  sub_help?: string;
}

interface IntegrationMetadata {
  icon: string;
  help_text?: string;
  has_auto_connect?: boolean;
  is_coming_soon?: boolean;
  fields: IntegrationField[];
}

interface IntegrationItem {
  service_id: string;
  title: string;
  description: string;
  status: "연결됨" | "미설정" | "준비 중";
  credentials: Record<string, string>;
  metadata: IntegrationMetadata;
  updated_at?: string;
}

interface IntegrationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IntegrationCenterModal: React.FC<IntegrationCenterModalProps> = ({ isOpen, onClose }) => {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [formData, setFormData] = useState<Record<string, Record<string, string>>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [savingService, setSavingService] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations");
      if (res.ok) {
        const data = await res.json();
        const items: IntegrationItem[] = data.integrations || [];
        setIntegrations(items);

        // Initialize form states
        const initialForm: Record<string, Record<string, string>> = {};
        items.forEach((item) => {
          initialForm[item.service_id] = { ...item.credentials };
        });
        setFormData(initialForm);
      } else {
        setNotification({ message: "연동 정보를 불러오지 못했습니다. (서버 응답 오류)", type: "error" });
      }
    } catch (e) {
      console.error("Failed to fetch integrations:", e);
      setNotification({ message: "서버와의 통신이 원활하지 않습니다.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchIntegrations();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFieldChange = (serviceId: string, fieldKey: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [serviceId]: {
        ...(prev[serviceId] || {}),
        [fieldKey]: value,
      },
    }));
  };

  const toggleShowSecret = (fieldKeyPath: string) => {
    setShowSecrets((prev) => ({
      ...prev,
      [fieldKeyPath]: !prev[fieldKeyPath],
    }));
  };

  const handleSave = async (serviceId: string) => {
    try {
      setSavingService(serviceId);
      const payload = formData[serviceId] || {};
      const res = await fetch(`/api/integrations/${serviceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showNotification("성공적으로 저장되었습니다.", "success");
        await fetchIntegrations();
      } else {
        showNotification("저장 중 오류가 발생했습니다.", "error");
      }
    } catch (e) {
      showNotification("서버 통신 실패", "error");
    } finally {
      setSavingService(null);
    }
  };

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        backgroundColor: '#07130F',
        border: '1px solid #133D2F',
        borderRadius: '20px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 35px rgba(16, 185, 129, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#E2E8F0'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 26px',
          borderBottom: '1px solid #143D30',
          backgroundColor: '#091F17',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2))',
              border: '1px solid #10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              ⚡
            </div>
            <div>
              <h2 style={{
                fontSize: '18px',
                fontWeight: 800,
                color: '#FFFFFF',
                margin: 0,
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                외부 서비스 연동 설정 센터
              </h2>
              <p style={{
                fontSize: '12px',
                color: '#6EE7B7',
                opacity: 0.8,
                margin: '2px 0 0 0',
                fontWeight: 500
              }}>
                모든 외부 API 연결을 한 곳에서 — 자격증명 입력 후 각 카드의 <b>저장</b>을 누르세요.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '8px',
              color: '#94A3B8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div style={{
            padding: '10px 16px',
            fontSize: '12px',
            textAlign: 'center',
            fontWeight: 700,
            backgroundColor: notification.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
            borderBottom: `1px solid ${notification.type === 'success' ? '#10B981' : '#F43F5E'}`,
            color: notification.type === 'success' ? '#6EE7B7' : '#FDA4AF'
          }}>
            {notification.message}
          </div>
        )}

        {/* Integration Cards Scroll Container (2 Column Grid) */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          backgroundColor: '#050E0A',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          alignContent: 'start'
        }}>
          {loading ? (
            <div style={{ gridColumn: '1 / -1', padding: '60px 0', textAlign: 'center', color: '#6EE7B7', fontSize: '14px', fontWeight: 600 }}>
              연동 정보를 불러오는 중입니다...
            </div>
          ) : (
            integrations.map((item) => {
              const currentCreds = formData[item.service_id] || {};
              const isComingSoon = item.metadata.is_coming_soon;
              const isConnected = item.status === "연결됨";

              return (
                <div
                  key={item.service_id}
                  style={{
                    backgroundColor: '#081C14',
                    border: '1px solid #143E30',
                    borderRadius: '16px',
                    padding: '18px',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#10B981';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#143E30';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.4)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div>
                    {/* Card Top: Title & Status Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>{item.metadata.icon}</span>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                          {item.title}
                        </h3>
                      </div>

                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: isConnected ? 'rgba(16, 185, 129, 0.2)' : isComingSoon ? 'rgba(100, 116, 139, 0.2)' : 'rgba(245, 158, 11, 0.15)',
                        border: `1px solid ${isConnected ? '#10B981' : isComingSoon ? '#64748B' : 'rgba(245, 158, 11, 0.4)'}`,
                        color: isConnected ? '#34D399' : isComingSoon ? '#94A3B8' : '#FBBF24'
                      }}>
                        {isConnected && <CheckCircle2 size={12} />}
                        {isComingSoon && <Clock size={12} />}
                        {item.status}
                      </span>
                    </div>

                    {/* Description */}
                    <p style={{
                      fontSize: '12px',
                      color: '#94A3B8',
                      lineHeight: '1.4',
                      margin: '0 0 14px 0'
                    }}>
                      {item.description}
                    </p>

                    {/* Input Fields */}
                    {!isComingSoon && item.metadata.fields.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                        {item.metadata.fields.map((field) => {
                          const pathKey = `${item.service_id}.${field.key}`;
                          const isSecretVisible = showSecrets[pathKey] || false;
                          const val = currentCreds[field.key] || "";

                          return (
                            <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '11px', fontWeight: 700, color: '#6EE7B7' }}>
                                {field.label}
                              </label>

                              {field.type === "select" ? (
                                <select
                                  value={val}
                                  onChange={(e) => handleFieldChange(item.service_id, field.key, e.target.value)}
                                  style={{
                                    width: '100%',
                                    backgroundColor: '#04100C',
                                    border: '1px solid #143E30',
                                    borderRadius: '8px',
                                    padding: '8px 10px',
                                    fontSize: '12px',
                                    color: '#FFFFFF',
                                    outline: 'none',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {field.options?.map((opt) => (
                                    <option key={opt} value={opt} style={{ background: '#071A14', color: '#FFF' }}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <div style={{ position: 'relative' }}>
                                  <input
                                    type={field.type === "password" && !isSecretVisible ? "password" : "text"}
                                    value={val}
                                    placeholder={field.placeholder}
                                    onChange={(e) => handleFieldChange(item.service_id, field.key, e.target.value)}
                                    style={{
                                      width: '100%',
                                      backgroundColor: '#04100C',
                                      border: '1px solid #143E30',
                                      borderRadius: '8px',
                                      padding: '8px 34px 8px 10px',
                                      fontSize: '12px',
                                      color: '#FFFFFF',
                                      outline: 'none',
                                      fontFamily: 'monospace'
                                    }}
                                  />
                                  {field.type === "password" && (
                                    <button
                                      type="button"
                                      onClick={() => toggleShowSecret(pathKey)}
                                      style={{
                                        position: 'absolute',
                                        right: '8px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: '#64748B',
                                        cursor: 'pointer',
                                        padding: '2px',
                                        display: 'flex',
                                        alignItems: 'center'
                                      }}
                                    >
                                      {isSecretVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                  )}
                                </div>
                              )}

                              {field.sub_help && (
                                <span style={{ fontSize: '10px', color: '#64748B' }}>
                                  💡 {field.sub_help}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Help Text */}
                    {item.metadata.help_text && (
                      <div style={{
                        fontSize: '11px',
                        color: '#6EE7B7',
                        opacity: 0.7,
                        marginBottom: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <BookOpen size={12} /> {item.metadata.help_text}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Actions */}
                  {!isComingSoon && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button
                        onClick={() => handleSave(item.service_id)}
                        disabled={savingService === item.service_id}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #10B981, #059669)',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        <Save size={13} />
                        {savingService === item.service_id ? "저장 중..." : "저장"}
                      </button>

                      {item.metadata.has_auto_connect && (
                        <button
                          onClick={() => window.open(`http://localhost:8000/api/integrations/${item.service_id}/oauth`, '_blank')}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(56, 189, 248, 0.15)',
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            color: '#38BDF8',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Zap size={13} /> 자동 연결
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
