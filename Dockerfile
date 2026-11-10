# ---------- 1) PWA (React + Vite) ----------
FROM node:24-alpine AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# valores públicos (URL do projeto e chave publishable do Supabase), embutidos no bundle
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
RUN npm run build

# ---------- 2) API .NET ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api
WORKDIR /src
COPY backend/src/MaluNutri.Domain/MaluNutri.Domain.csproj src/MaluNutri.Domain/
COPY backend/src/MaluNutri.Application/MaluNutri.Application.csproj src/MaluNutri.Application/
COPY backend/src/MaluNutri.Infrastructure/MaluNutri.Infrastructure.csproj src/MaluNutri.Infrastructure/
COPY backend/src/MaluNutri.Api/MaluNutri.Api.csproj src/MaluNutri.Api/
RUN dotnet restore src/MaluNutri.Api/MaluNutri.Api.csproj
COPY backend/src/ src/
RUN dotnet publish src/MaluNutri.Api/MaluNutri.Api.csproj -c Release -o /app --no-restore

# ---------- 3) Runtime: uma só máquina serve API + PWA ----------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=api /app ./
COPY --from=web /web/dist ./wwwroot
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_gcHeapHardLimitPercent=0x46
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "MaluNutri.Api.dll"]
