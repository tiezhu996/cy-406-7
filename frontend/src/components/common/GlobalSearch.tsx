import { useEffect, useMemo, useRef, useState } from 'react';
import { Input, List, Tag, Typography } from '@arco-design/web-react';
import { IconSearch } from '@arco-design/web-react/icon';
import { useNavigate } from 'react-router-dom';
import { useTemplateStore } from '../../stores/template';
import { useClauseStore } from '../../stores/clause';
import { useInstanceStore } from '../../stores/instance';
import { Template } from '../../types/template';
import { Clause } from '../../types/clause';
import { ContractInstance } from '../../types/contract-instance';
import { TEMPLATE_CATEGORY_LABELS, CLAUSE_CATEGORY_LABELS } from '../../types/enums';

type SearchItemType = 'template' | 'clause' | 'instance';

interface SearchResult {
  type: SearchItemType;
  id: string;
  title: string;
  excerpt: string;
  categoryLabel: string;
  url: string;
}

function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

function highlight(text: string, keyword: string): React.ReactNode {
  if (!keyword) return text;
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  const index = lowerText.indexOf(lowerKeyword);
  if (index === -1) return text;

  return (
    <>
      {text.slice(0, index)}
      <span style={{ color: 'var(--redwood)', fontWeight: 600 }}>
        {text.slice(index, index + keyword.length)}
      </span>
      {text.slice(index + keyword.length)}
    </>
  );
}

function getExcerpt(content: string, keyword: string, maxLen = 80): string {
  const plain = stripHtml(content);
  if (!keyword) return plain.slice(0, maxLen) + (plain.length > maxLen ? '...' : '');

  const lowerPlain = plain.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  const index = lowerPlain.indexOf(lowerKeyword);

  if (index === -1) return plain.slice(0, maxLen) + (plain.length > maxLen ? '...' : '');

  const start = Math.max(0, index - 20);
  const end = Math.min(plain.length, index + keyword.length + 40);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < plain.length ? '...' : '';
  return prefix + plain.slice(start, end) + suffix;
}

export function GlobalSearch() {
  const [keyword, setKeyword] = useState('');
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const templates = useTemplateStore((s) => s.templates);
  const clauses = useClauseStore((s) => s.clauses);
  const instances = useInstanceStore((s) => s.instances);
  const loadTemplates = useTemplateStore((s) => s.loadTemplates);
  const loadClauses = useClauseStore((s) => s.loadClauses);
  const loadInstances = useInstanceStore((s) => s.loadInstances);

  useEffect(() => {
    loadTemplates();
    loadClauses();
    loadInstances();
  }, [loadTemplates, loadClauses, loadInstances]);

  const results = useMemo<SearchResult[]>(() => {
    if (!keyword.trim()) return [];
    const kw = keyword.trim().toLowerCase();

    const templateResults: SearchResult[] = templates
      .filter((t: Template) =>
        t.title.toLowerCase().includes(kw) ||
        stripHtml(t.contentHtml).toLowerCase().includes(kw)
      )
      .map((t: Template) => ({
        type: 'template' as SearchItemType,
        id: t.id,
        title: t.title,
        excerpt: getExcerpt(t.contentHtml, keyword),
        categoryLabel: TEMPLATE_CATEGORY_LABELS[t.category],
        url: `/templates/${t.id}/edit`
      }));

    const clauseResults: SearchResult[] = clauses
      .filter((c: Clause) =>
        c.title.toLowerCase().includes(kw) ||
        stripHtml(c.contentHtml).toLowerCase().includes(kw)
      )
      .map((c: Clause) => ({
        type: 'clause' as SearchItemType,
        id: c.id,
        title: c.title,
        excerpt: getExcerpt(c.contentHtml, keyword),
        categoryLabel: CLAUSE_CATEGORY_LABELS[c.category],
        url: `/clauses`
      }));

    const instanceResults: SearchResult[] = instances
      .filter((i: ContractInstance) =>
        i.title.toLowerCase().includes(kw) ||
        stripHtml(i.finalHtml).toLowerCase().includes(kw)
      )
      .map((i: ContractInstance) => ({
        type: 'instance' as SearchItemType,
        id: i.id,
        title: i.title,
        excerpt: getExcerpt(i.finalHtml, keyword),
        categoryLabel: '合同实例',
        url: `/instances/${i.id}`
      }));

    return [...templateResults, ...clauseResults, ...instanceResults];
  }, [keyword, templates, clauses, instances]);

  const groupedResults = useMemo(() => {
    const groups: Record<SearchItemType, SearchResult[]> = {
      template: [],
      clause: [],
      instance: []
    };
    results.forEach((r) => groups[r.type].push(r));
    return groups;
  }, [results]);

  const groupLabels: Record<SearchItemType, string> = {
    template: '模板',
    clause: '条款',
    instance: '实例'
  };

  const groupColors: Record<SearchItemType, string> = {
    template: 'arcoblue',
    clause: 'green',
    instance: 'orangered'
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (url: string) => {
    navigate(url);
    setVisible(false);
    setKeyword('');
  };

  const handleFocus = () => {
    if (keyword.trim()) {
      setVisible(true);
    }
  };

  const handleInputChange = (value: string) => {
    setKeyword(value);
    setVisible(!!value.trim());
  };

  const totalCount = results.length;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: 360 }}>
      <Input
        allowClear
        size="default"
        placeholder="搜索模板、条款、实例..."
        prefix={<IconSearch />}
        value={keyword}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onPressEnter={() => keyword.trim() && setVisible(true)}
      />
      {visible && totalCount > 0 && (
        <div
          className="global-search-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            zIndex: 1000,
            maxHeight: 480,
            overflow: 'auto',
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            boxShadow: 'var(--shadow)'
          }}
        >
          {(Object.keys(groupedResults) as SearchItemType[])
            .filter((type) => groupedResults[type].length > 0)
            .map((type) => (
              <div key={type} style={{ padding: '8px 0' }}>
                <div
                  style={{
                    padding: '4px 16px 8px',
                    fontSize: 12,
                    color: 'var(--muted)',
                    fontWeight: 500
                  }}
                >
                  {groupLabels[type]} · {groupedResults[type].length} 条
                </div>
                <List
                  size="small"
                  dataSource={groupedResults[type]}
                  render={(item) => (
                    <List.Item
                      key={item.id}
                      className="global-search-item"
                      style={{ cursor: 'pointer', padding: '8px 16px' }}
                      onClick={() => handleSelect(item.url)}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Tag color={groupColors[type]} size="small" style={{ flexShrink: 0 }}>
                            {item.categoryLabel}
                          </Tag>
                          <Typography.Text
                            style={{
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {highlight(item.title, keyword)}
                          </Typography.Text>
                        </div>
                        <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: 1.5 }}>
                          {highlight(item.excerpt, keyword)}
                        </Typography.Text>
                      </div>
                    </List.Item>
                  )}
                />
              </div>
            ))}
        </div>
      )}
      {visible && keyword.trim() && totalCount === 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            zIndex: 1000,
            padding: '24px 16px',
            textAlign: 'center',
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            boxShadow: 'var(--shadow)',
            color: 'var(--muted)'
          }}
        >
          未找到相关内容
        </div>
      )}
    </div>
  );
}
