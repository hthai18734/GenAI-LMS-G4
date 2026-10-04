const ServiceError = require('../../service/common/ServiceError');

class GeminiClient {
  constructor({ env = process.env, fetch = globalThis.fetch, timeoutMs = 15000 } = {}) {
    this.env = env;
    this.fetch = fetch;
    this.timeoutMs = timeoutMs;
  }

  async generateContent({ contents, systemInstruction, generationConfig } = {}) {
    const key = this.env.GEMINI_API_KEY?.trim();
    const models = [
      ...new Set(
        [this.env.GEMINI_MODEL, ...(this.env.GEMINI_FALLBACK_MODELS || '').split(',')]
          .map((value) => value?.trim())
          .filter(Boolean),
      ),
    ];
    if (!key || !models.length) throw new ServiceError(503, 'AI chưa được cấu hình.');
    if (!Array.isArray(contents) || !contents.length)
      throw new ServiceError(400, 'Nội dung câu hỏi không được để trống.');

    const body = JSON.stringify({ contents, systemInstruction, generationConfig });
    const hasPdf = contents.some((content) =>
      content.parts?.some((part) => part.inlineData?.mimeType === 'application/pdf'),
    );

    for (const model of models) {
      if (hasPdf && model.startsWith('gemma-')) continue;
      let response;
      let data;
      try {
        response = await this.fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body,
            signal: AbortSignal.timeout(this.timeoutMs),
          },
        );
        data = await response.json();
      } catch {
        throw new ServiceError(502, 'Không thể kết nối AI. Vui lòng thử lại sau.');
      }

      if (!response.ok) {
        if ([429, 404, 500, 502, 503, 504].includes(response.status)) continue;

        throw new ServiceError(
          502,
          'AI từ chối yêu cầu. Vui lòng kiểm tra cấu hình và định dạng tài liệu.',
        );
      }

      const candidate = data.candidates?.[0];
      if (
        data.promptFeedback?.blockReason ||
        (candidate?.finishReason && !['STOP', 'MAX_TOKENS'].includes(candidate.finishReason))
      ) {
        throw new ServiceError(
          422,
          'AI không thể trả lời nội dung này. Vui lòng điều chỉnh câu hỏi.',
        );
      }
      const text = candidate?.content?.parts
        ?.filter((part) => !part.thought)
        .map((part) => part.text || '')
        .join('')
        .trim();
      if (!text) throw new ServiceError(502, 'AI chưa trả về câu trả lời. Vui lòng thử lại.');
      return { text, model };
    }
    throw new ServiceError(
      503,
      'Các model AI hiện đã hết lượt hoặc không khả dụng. Vui lòng thử lại sau.',
    );
  }
}

module.exports = GeminiClient;
