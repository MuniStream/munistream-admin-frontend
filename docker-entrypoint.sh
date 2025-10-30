#!/bin/sh
set -e

# Replace environment variables in the built files
echo "Configuring admin portal for tenant: ${VITE_TENANT}"

# Find all JS files and replace placeholders
find /usr/share/nginx/html -type f -name "*.js" | while read file; do
  sed -i "s|__VITE_API_URL__|${VITE_API_URL}|g" "$file"
  sed -i "s|__VITE_API_BASE_URL__|${VITE_API_BASE_URL}|g" "$file"
  sed -i "s|__VITE_KEYCLOAK_URL__|${VITE_KEYCLOAK_URL}|g" "$file"
  sed -i "s|__VITE_KEYCLOAK_REALM__|${VITE_KEYCLOAK_REALM}|g" "$file"
  sed -i "s|__VITE_KEYCLOAK_CLIENT_ID__|${VITE_KEYCLOAK_CLIENT_ID}|g" "$file"
  sed -i "s|__VITE_TENANT__|${VITE_TENANT}|g" "$file"
  sed -i "s|__VITE_TENANT_ID__|${VITE_TENANT_ID}|g" "$file"
  sed -i "s|__VITE_TENANT_NAME__|${VITE_TENANT_NAME}|g" "$file"
  sed -i "s|__VITE_ORGANIZATION__|${VITE_ORGANIZATION}|g" "$file"

  # Also replace any hardcoded localhost:8180 references
  sed -i "s|http://localhost:8180|${VITE_KEYCLOAK_URL}|g" "$file"
  sed -i "s|munistream-admin|${VITE_KEYCLOAK_CLIENT_ID}|g" "$file"
  sed -i "s|/realms/munistream|/realms/${VITE_KEYCLOAK_REALM}|g" "$file"
done

echo "Admin portal configuration complete"

# Start nginx
nginx -g "daemon off;"