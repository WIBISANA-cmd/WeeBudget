<?php

namespace Tests\Unit;

use App\Services\DynamicSchema\HtmlSanitizer;
use PHPUnit\Framework\TestCase;

class HtmlSanitizerTest extends TestCase
{
    public function test_removes_script_tags_and_content(): void
    {
        $input = '<p>Normal text</p><script>alert("xss")</script><div>End</div>';
        $output = HtmlSanitizer::sanitize($input);

        $this->assertStringNotContainsString('script', $output);
        $this->assertStringNotContainsString('alert', $output);
        $this->assertStringContainsString('<p>Normal text</p>', $output);
    }

    public function test_strips_onerror_and_all_attributes_from_tags(): void
    {
        $input = '<img src=x onerror=alert(1)><b style="color:red" onclick="run()">Bold</b>';
        $output = HtmlSanitizer::sanitize($input);

        $this->assertStringNotContainsString('onerror', $output);
        $this->assertStringNotContainsString('alert(1)', $output);
        $this->assertStringNotContainsString('onclick', $output);
        $this->assertStringNotContainsString('style', $output);
        $this->assertStringContainsString('<b>Bold</b>', $output);
    }

    public function test_strips_javascript_href_from_anchor(): void
    {
        $input = '<a href="javascript:alert(1)">Click Me</a>';
        $output = HtmlSanitizer::sanitize($input);

        $this->assertStringNotContainsString('javascript:', $output);
        $this->assertStringNotContainsString('href', $output);
        $this->assertStringContainsString('<a>Click Me</a>', $output);
    }

    public function test_allows_valid_https_and_mailto_hrefs(): void
    {
        $input = '<a href="https://example.com" target="_blank" onclick="hack()">Link</a> and <a href="mailto:admin@example.com">Email</a>';
        $output = HtmlSanitizer::sanitize($input);

        $this->assertStringContainsString('<a href="https://example.com">Link</a>', $output);
        $this->assertStringContainsString('<a href="mailto:admin@example.com">Email</a>', $output);
        $this->assertStringNotContainsString('onclick', $output);
        $this->assertStringNotContainsString('target', $output);
    }

    public function test_removes_iframe_and_style_tags_completely(): void
    {
        $input = '<style>body { display: none; }</style><iframe src="https://evil.com"></iframe><p>Safe</p>';
        $output = HtmlSanitizer::sanitize($input);

        $this->assertStringNotContainsString('iframe', $output);
        $this->assertStringNotContainsString('style', $output);
        $this->assertStringNotContainsString('evil.com', $output);
        $this->assertStringContainsString('<p>Safe</p>', $output);
    }
}
