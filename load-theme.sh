#!/bin/sh

set -e

TENANT_ID="${VITE_TENANT_ID:-${VITE_TENANT}}"
THEME_SOURCE_DIR="/app/plugins/${TENANT_ID}/themes/admin"
THEME_TARGET_DIR="/app/public/themes"

echo "🎨 Loading admin theme for tenant: $TENANT_ID"

# Create target theme directory
mkdir -p "$THEME_TARGET_DIR"

if [ ! -d "$THEME_SOURCE_DIR" ]; then
    echo "⚠️  Admin theme source directory not found: $THEME_SOURCE_DIR"
    echo "ℹ️  Creating default admin theme configuration..."

    # Create default admin theme config
    cat > "$THEME_TARGET_DIR/theme-config.json" << 'EOF'
{
  "metadata": {
    "name": "Default Admin Theme",
    "organization": "MuniStream",
    "tenant_id": "default",
    "frontend_type": "admin"
  },
  "colors": {
    "primary_main": "#1976d2",
    "secondary_main": "#dc004e",
    "background_default": "#f5f5f7",
    "background_paper": "#ffffff",
    "text_primary": "#000000",
    "text_secondary": "#666666"
  },
  "typography": {
    "font_family": "\"Inter\", \"Roboto\", \"Helvetica\", \"Arial\", sans-serif"
  },
  "header": {
    "height": 64,
    "backgroundColor": "#1976d2",
    "textColor": "#ffffff",
    "logoSize": {
      "desktop": { "width": 150, "height": 40 },
      "mobile": { "width": 120, "height": 32 }
    }
  },
  "templates": {
    "enabled": false,
    "components": {},
    "layouts": {},
    "variables": {}
  }
}
EOF
    echo "✅ Created default admin theme configuration"
    exit 0
fi

echo "📂 Found admin theme directory: $THEME_SOURCE_DIR"

# Copy theme configuration
if [ -f "$THEME_SOURCE_DIR/theme.yaml" ]; then
    echo "🔧 Converting admin theme.yaml to theme-config.json..."

    # Use js-yaml CLI to convert YAML to JSON
    if js-yaml "$THEME_SOURCE_DIR/theme.yaml" > "$THEME_TARGET_DIR/theme-config.json.tmp" 2>/dev/null; then
        # Add admin-specific metadata using node
        node -e "
            const fs = require('fs');

            try {
                const themeConfig = JSON.parse(fs.readFileSync('$THEME_TARGET_DIR/theme-config.json.tmp', 'utf8'));

                // Ensure this is marked as admin frontend
                if (!themeConfig.metadata) themeConfig.metadata = {};
                themeConfig.metadata.frontend_type = 'admin';

                // Ensure templates section exists
                if (!themeConfig.templates) {
                    themeConfig.templates = { enabled: false };
                }

                fs.writeFileSync('$THEME_TARGET_DIR/theme-config.json', JSON.stringify(themeConfig, null, 2));
                console.log('✅ Admin theme configuration converted successfully');
            } catch (error) {
                console.error('❌ Error processing admin theme:', error.message);
                process.exit(1);
            }
        "
        rm -f "$THEME_TARGET_DIR/theme-config.json.tmp"
    else
        echo "❌ Failed to convert YAML to JSON"
        exit 1
    fi
else
    echo "⚠️  No theme.yaml found, creating basic admin configuration"
    cat > "$THEME_TARGET_DIR/theme-config.json" << EOF
{
  "metadata": {
    "name": "Basic Admin Theme",
    "organization": "MuniStream",
    "tenant_id": "$TENANT_ID",
    "frontend_type": "admin"
  },
  "colors": {
    "primary_main": "#1976d2",
    "secondary_main": "#dc004e",
    "background_default": "#f5f5f7",
    "background_paper": "#ffffff"
  },
  "header": {
    "height": 64,
    "backgroundColor": "#1976d2",
    "textColor": "#ffffff"
  },
  "templates": {
    "enabled": false
  }
}
EOF
fi

# Process admin HTML templates and inject into built HTML
if [ -d "$THEME_SOURCE_DIR/templates" ]; then
    echo "📁 Processing admin HTML templates for injection..."

    # Create target templates directory
    mkdir -p "$THEME_TARGET_DIR/templates"
    cp -r "$THEME_SOURCE_DIR/templates"/* "$THEME_TARGET_DIR/templates/"

    # Process index.html to inject theme elements
    INDEX_FILE="/usr/share/nginx/html/index.html"
    if [ -f "$INDEX_FILE" ]; then
        echo "🔧 Injecting admin theme elements into index.html..."

        # Read theme configuration to get metadata
        THEME_CONFIG=$(cat "$THEME_TARGET_DIR/theme-config.json" 2>/dev/null || echo '{}')

        # Extract organization name and tenant info from theme config
        ORGANIZATION=$(echo "$THEME_CONFIG" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8')).metadata?.organization || 'MuniStream')")
        TENANT_NAME=$(echo "$THEME_CONFIG" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8')).metadata?.tenant_name || '$TENANT_ID')")

        # Create a backup
        cp "$INDEX_FILE" "$INDEX_FILE.backup"

        # Start building the new HTML
        cat > "$INDEX_FILE" << 'HTMLSTART'
<!doctype html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
HTMLSTART

        # Add favicon if exists
        if [ -f "$THEME_TARGET_DIR/templates/favicon.html" ]; then
            echo "    <!-- Admin Theme Favicon -->" >> "$INDEX_FILE"
            cat "$THEME_TARGET_DIR/templates/favicon.html" >> "$INDEX_FILE"
        else
            echo '    <link rel="icon" type="image/svg+xml" href="/vite.svg" />' >> "$INDEX_FILE"
        fi

        # Add title
        echo "    <title>$ORGANIZATION - Portal Administrativo</title>" >> "$INDEX_FILE"

        # Add custom head elements if exists
        if [ -f "$THEME_TARGET_DIR/templates/head.html" ]; then
            echo "    <!-- Admin Theme Head Elements -->" >> "$INDEX_FILE"
            cat "$THEME_TARGET_DIR/templates/head.html" >> "$INDEX_FILE"
        fi

        # Add the built CSS and JS from the backup
        grep '<script\|<link.*stylesheet' "$INDEX_FILE.backup" >> "$INDEX_FILE"

        cat >> "$INDEX_FILE" << 'HEADEND'
</head>
<body>
HEADEND

        # Add custom header if exists
        if [ -f "$THEME_TARGET_DIR/templates/header.html" ]; then
            echo "    <!-- Admin Theme Header -->" >> "$INDEX_FILE"
            cat "$THEME_TARGET_DIR/templates/header.html" >> "$INDEX_FILE"
        fi

        # Add the root div
        echo '    <div id="root"></div>' >> "$INDEX_FILE"

        # Add custom footer if exists
        if [ -f "$THEME_TARGET_DIR/templates/footer.html" ]; then
            echo "    <!-- Admin Theme Footer -->" >> "$INDEX_FILE"
            cat "$THEME_TARGET_DIR/templates/footer.html" >> "$INDEX_FILE"
        fi

        # Close body and html
        cat >> "$INDEX_FILE" << 'HTMLEND'
</body>
</html>
HTMLEND

        echo "✅ Admin theme elements injected successfully into index.html"

        # Update theme config to mark templates as processed
        node -e "
            const fs = require('fs');
            try {
                const config = JSON.parse(fs.readFileSync('$THEME_TARGET_DIR/theme-config.json', 'utf8'));
                if (!config.templates) config.templates = {};
                config.templates.enabled = true;
                config.templates.injected = true;
                fs.writeFileSync('$THEME_TARGET_DIR/theme-config.json', JSON.stringify(config, null, 2));
            } catch (error) {
                console.error('Error updating admin template config:', error.message);
            }
        "
    else
        echo "❌ index.html not found at $INDEX_FILE"
    fi
else
    echo "ℹ️  No admin templates directory found"
fi

# Copy assets if they exist
if [ -d "$THEME_SOURCE_DIR/assets" ]; then
    echo "🖼️  Copying admin theme assets..."
    cp -r "$THEME_SOURCE_DIR/assets" "$THEME_TARGET_DIR/"
    echo "✅ Admin assets copied successfully"
else
    echo "ℹ️  No admin assets directory found"
fi

echo "🎨 Admin theme loading completed for $TENANT_ID"