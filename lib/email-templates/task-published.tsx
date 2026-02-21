import React from "react";

export interface TaskPublishedEmailProps {
  parentName: string;
  taskWeekStart: string;
  taskWeekEnd: string;
  classCourse: string;
  familyPortalUrl: string;
  optOutUrl: string;
}

/**
 * Traditional Chinese email template for task publication notifications.
 *
 * Sent to families when a new weekly task is published for their class-course.
 * Includes a direct link to the family portal and an option to opt-out of notifications.
 *
 * @param props - Email template properties
 * @returns React email component with Traditional Chinese content
 *
 * @example
 * ```tsx
 * const emailHtml = renderToStaticMarkup(
 *   <TaskPublishedEmail
 *     parentName="王小明"
 *     taskWeekStart="2026-02-24"
 *     taskWeekEnd="2026-03-02"
 *     classCourse="三年級 - 基礎英語"
 *     familyPortalUrl="https://example.com/family/abc123"
 *     optOutUrl="https://example.com/family/preferences?token=abc123"
 *   />
 * );
 * ```
 */
export function TaskPublishedEmail({
  parentName,
  taskWeekStart,
  taskWeekEnd,
  classCourse,
  familyPortalUrl,
  optOutUrl,
}: TaskPublishedEmailProps) {
  return (
    <html lang="zh-TW">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>新任務已發布</title>
      </head>
      <body style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Microsoft JhengHei", sans-serif',
        backgroundColor: '#f5f5f5',
        margin: 0,
        padding: 0,
      }}>
        <table width="100%" cellPadding="0" cellSpacing="0" style={{ backgroundColor: '#f5f5f5', padding: '40px 0' }}>
          <tr>
            <td align="center">
              <table width="600" cellPadding="0" cellSpacing="0" style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              }}>
                {/* Header */}
                <tr>
                  <td style={{
                    backgroundColor: '#3b82f6',
                    borderRadius: '8px 8px 0 0',
                    padding: '32px 40px',
                    textAlign: 'center',
                  }}>
                    <h1 style={{
                      color: '#ffffff',
                      fontSize: '24px',
                      fontWeight: 'bold',
                      margin: 0,
                    }}>
                      📚 新的學習任務已發布
                    </h1>
                  </td>
                </tr>

                {/* Content */}
                <tr>
                  <td style={{ padding: '40px' }}>
                    {/* Greeting */}
                    <p style={{
                      color: '#1f2937',
                      fontSize: '16px',
                      lineHeight: '24px',
                      margin: '0 0 24px 0',
                    }}>
                      {parentName} 您好，
                    </p>

                    {/* Task Information */}
                    <p style={{
                      color: '#4b5563',
                      fontSize: '16px',
                      lineHeight: '24px',
                      margin: '0 0 24px 0',
                    }}>
                      您孩子的新一週學習任務已經發布了！請協助孩子完成本週的英語練習。
                    </p>

                    {/* Task Details Box */}
                    <div style={{
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      padding: '20px',
                      margin: '0 0 24px 0',
                    }}>
                      <p style={{
                        color: '#6b7280',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        margin: '0 0 12px 0',
                        textTransform: 'uppercase',
                      }}>
                        任務詳情
                      </p>
                      <table width="100%" cellPadding="0" cellSpacing="0">
                        <tr>
                          <td style={{
                            color: '#6b7280',
                            fontSize: '14px',
                            padding: '4px 0',
                            width: '100px',
                          }}>
                            班級課程：
                          </td>
                          <td style={{
                            color: '#1f2937',
                            fontSize: '14px',
                            fontWeight: '600',
                            padding: '4px 0',
                          }}>
                            {classCourse}
                          </td>
                        </tr>
                        <tr>
                          <td style={{
                            color: '#6b7280',
                            fontSize: '14px',
                            padding: '4px 0',
                          }}>
                            任務週期：
                          </td>
                          <td style={{
                            color: '#1f2937',
                            fontSize: '14px',
                            fontWeight: '600',
                            padding: '4px 0',
                          }}>
                            {taskWeekStart} 至 {taskWeekEnd}
                          </td>
                        </tr>
                      </table>
                    </div>

                    {/* CTA Button */}
                    <div style={{ textAlign: 'center', margin: '0 0 32px 0' }}>
                      <a
                        href={familyPortalUrl}
                        style={{
                          backgroundColor: '#3b82f6',
                          color: '#ffffff',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          textDecoration: 'none',
                          padding: '14px 32px',
                          borderRadius: '6px',
                          display: 'inline-block',
                        }}
                      >
                        查看任務內容
                      </a>
                    </div>

                    {/* Helpful Tip */}
                    <div style={{
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '6px',
                      padding: '16px',
                      margin: '0 0 24px 0',
                    }}>
                      <p style={{
                        color: '#1e40af',
                        fontSize: '14px',
                        lineHeight: '20px',
                        margin: 0,
                      }}>
                        💡 <strong>溫馨提醒：</strong>每週完成任務可以幫助孩子養成良好的學習習慣，建議固定時間進行練習效果最佳。
                      </p>
                    </div>
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td style={{
                    backgroundColor: '#f9fafb',
                    borderRadius: '0 0 8px 8px',
                    padding: '24px 40px',
                    borderTop: '1px solid #e5e7eb',
                  }}>
                    <p style={{
                      color: '#6b7280',
                      fontSize: '12px',
                      lineHeight: '18px',
                      margin: '0 0 8px 0',
                      textAlign: 'center',
                    }}>
                      如果您不想收到這類通知，可以
                      {' '}
                      <a
                        href={optOutUrl}
                        style={{
                          color: '#3b82f6',
                          textDecoration: 'underline',
                        }}
                      >
                        取消訂閱
                      </a>
                    </p>
                    <p style={{
                      color: '#9ca3af',
                      fontSize: '12px',
                      lineHeight: '18px',
                      margin: 0,
                      textAlign: 'center',
                    }}>
                      此郵件由系統自動發送，請勿直接回覆
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}
