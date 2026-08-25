<?php

namespace App\Services\DynamicSchema;

class HtmlSanitizer
{
    private const ALLOWED_TAGS = [
        'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'strike',
        'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'blockquote', 'code', 'pre', 'a', 'hr', 'span'
    ];

    private const REMOVE_WITH_CONTENT = [
        'script', 'style', 'iframe', 'object', 'embed', 'applet', 'svg', 'canvas', 'template'
    ];

    /**
     * Sanitize HTML content using a strict tokenizing allowlist.
     * All attributes on allowed tags are completely stripped except safe `href` on `<a>`.
     */
    public static function sanitize(?string $html): string
    {
        if ($html === null || $html === '') {
            return '';
        }

        // 1. Remove dangerous tags along with their inner contents
        foreach (self::REMOVE_WITH_CONTENT as $badTag) {
            $pattern = sprintf('/<%s\b[^>]*>.*?<\/%s>/is', preg_quote($badTag, '/'), preg_quote($badTag, '/'));
            $html = preg_replace($pattern, '', $html);
            // Also remove self-closing or unclosed bad tags
            $patternSelf = sprintf('/<%s\b[^>]*\/?>/is', preg_quote($badTag, '/'));
            $html = preg_replace($patternSelf, '', $html);
        }

        // 2. Parse and tokenize remaining HTML tags
        // Match any HTML tag: <(/)?([a-z0-9]+)([^>]*)>
        $sanitized = preg_replace_callback('/<(\/)?([a-zA-Z0-9]+)([^>]*)>/s', function ($matches) {
            $isClosing = $matches[1] === '/';
            $tagName = strtolower($matches[2]);
            $rawAttributes = $matches[3] ?? '';

            if (! in_array($tagName, self::ALLOWED_TAGS, true)) {
                // Not allowed tag: strip it completely
                return '';
            }

            if ($isClosing) {
                return "</{$tagName}>";
            }

            // Void tags without closing
            if ($tagName === 'br' || $tagName === 'hr') {
                return "<{$tagName}>";
            }

            // For <a> tag, strictly allow only safe href
            if ($tagName === 'a') {
                $href = self::extractSafeHref($rawAttributes);
                if ($href !== null) {
                    return sprintf('<a href="%s">', htmlspecialchars($href, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
                }

                return '<a>';
            }

            // All other allowed tags are emitted completely naked without attributes
            return "<{$tagName}>";
        }, $html);

        return trim($sanitized);
    }

    private static function extractSafeHref(string $rawAttributes): ?string
    {
        if (preg_match('/\bhref\s*=\s*(["\'])(.*?)\1/is', $rawAttributes, $matches)) {
            $href = trim($matches[2]);
        } elseif (preg_match('/\bhref\s*=\s*([^\s>]+)/is', $rawAttributes, $matches)) {
            $href = trim($matches[1]);
        } else {
            return null;
        }

        // Decode HTML entities in href to prevent obfuscated javascript: links
        $decodedHref = html_entity_decode($href, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $decodedHref = preg_replace('/\s+/', '', $decodedHref);

        // Disallow dangerous schemes like javascript:, data:, vbscript:
        if (preg_match('/^(https?:\/\/|mailto:)/i', $decodedHref)) {
            return $href;
        }

        return null;
    }
}
