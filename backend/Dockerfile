FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY EFU.Inventory.csproj ./
RUN dotnet restore EFU.Inventory.csproj

COPY . ./
RUN dotnet publish EFU.Inventory.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_EnableDiagnostics=0

COPY --from=build /app/publish ./

EXPOSE 10000
USER $APP_UID

ENTRYPOINT ["dotnet", "EFU.Inventory.dll"]
